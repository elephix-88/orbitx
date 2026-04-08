from datetime import datetime, timedelta
from typing import Any

import pandas as pd
from loguru import logger

from common.database.mongodb import database
from common.model.anomaly import AnomalyDetectorConfig, AnomalySnapshot
from common.model.common import BaseFieldSchema
from engine.configs.config import settings
from engine.interfaces.node import Transformer


class AnomalyDetectorTransformer(Transformer):
    """Compares current metrics against a rolling average and flags anomalies.

    Works with any upstream data source — all column references are dynamic.
    Stores daily snapshots in MongoDB as a side effect for baseline computation.
    """

    def __init__(self, config: AnomalyDetectorConfig) -> None:
        self.config = config

    async def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        available_metrics = [
            metric for metric in self.config.metrics
            if metric in data.columns
        ]

        missing_metrics = set(self.config.metrics) - set(available_metrics)
        if missing_metrics:
            logger.warning(
                f"Anomaly detector: columns not found in data, skipping: {missing_metrics}"
            )

        if not available_metrics or self.config.group_by not in data.columns:
            logger.warning(
                "Anomaly detector: no valid metrics or group_by column — returning data unchanged"
            )
            return self.attach_empty_anomaly_columns(data, available_metrics)

        today = datetime.utcnow().strftime("%Y-%m-%d")
        aggregated = self.aggregate_by_group(data, available_metrics)

        await self.save_snapshot(aggregated, today)

        cutoff_date = (
            datetime.utcnow() - timedelta(days=self.config.window_days)
        ).strftime("%Y-%m-%d")
        history = await self.load_history(cutoff_date)

        anomaly_results = self.compute_anomalies(aggregated, history)

        return self.merge_anomaly_columns(data, anomaly_results, available_metrics)

    def aggregate_by_group(
        self, data: pd.DataFrame, metrics: list[str],
    ) -> pd.DataFrame:
        columns_to_aggregate = [self.config.group_by] + metrics
        existing_columns = [
            column for column in columns_to_aggregate if column in data.columns
        ]
        return (
            data[existing_columns]
            .groupby(self.config.group_by, as_index=False)
            .mean(numeric_only=True)
        )

    async def save_snapshot(
        self, aggregated: pd.DataFrame, snapshot_date: str,
    ) -> None:
        collection = database[settings.anomaly_snapshots_collection]

        for _, row in aggregated.iterrows():
            group_key = str(row[self.config.group_by])
            metric_values = {}
            for metric in self.config.metrics:
                if metric in row.index and pd.notna(row[metric]):
                    metric_values[metric] = float(row[metric])

            snapshot = AnomalySnapshot(
                workflow_id=self.config.workflow_id,
                node_instance_id=self.config.node_instance_id,
                snapshot_date=snapshot_date,
                group_key=group_key,
                metrics=metric_values,
            )

            try:
                await collection.update_one(
                    {
                        "workflow_id": snapshot.workflow_id,
                        "node_instance_id": snapshot.node_instance_id,
                        "snapshot_date": snapshot.snapshot_date,
                        "group_key": snapshot.group_key,
                    },
                    {"$set": snapshot.model_dump()},
                    upsert=True,
                )
            except Exception as error:
                logger.warning(
                    f"Anomaly detector: failed to save snapshot for "
                    f"group '{group_key}': {error}"
                )

    async def load_history(self, cutoff_date: str) -> list[AnomalySnapshot]:
        collection = database[settings.anomaly_snapshots_collection]

        cursor = collection.find({
            "workflow_id": self.config.workflow_id,
            "node_instance_id": self.config.node_instance_id,
            "snapshot_date": {"$gte": cutoff_date},
        })

        documents = await cursor.to_list(length=None)
        snapshots = []
        for document in documents:
            try:
                snapshots.append(AnomalySnapshot.model_validate(document))
            except Exception as error:
                logger.warning(f"Anomaly detector: skipping invalid snapshot: {error}")

        return snapshots

    def compute_anomalies(
        self,
        current_aggregated: pd.DataFrame,
        history: list[AnomalySnapshot],
    ) -> dict[str, dict[str, dict[str, Any]]]:
        """Compute anomaly flags per group per metric.

        Returns: {group_key: {metric: {is_anomaly, deviation_percent, baseline}}}
        """
        baselines = self.build_baselines(history)
        results: dict[str, dict[str, dict[str, Any]]] = {}

        for _, row in current_aggregated.iterrows():
            group_key = str(row[self.config.group_by])
            group_baselines = baselines.get(group_key, {})
            group_results: dict[str, dict[str, Any]] = {}
            anomaly_count = 0

            for metric in self.config.metrics:
                if metric not in row.index or pd.isna(row[metric]):
                    group_results[metric] = {
                        "is_anomaly": False,
                        "deviation_percent": 0.0,
                        "baseline": 0.0,
                    }
                    continue

                current_value = float(row[metric])
                metric_baseline = group_baselines.get(metric)

                if metric_baseline is None or metric_baseline["count"] < self.config.window_days:
                    group_results[metric] = {
                        "is_anomaly": False,
                        "deviation_percent": 0.0,
                        "baseline": metric_baseline["average"] if metric_baseline else 0.0,
                    }
                    continue

                average = metric_baseline["average"]
                if average == 0:
                    deviation_percent = 0.0
                else:
                    deviation_percent = ((current_value - average) / abs(average)) * 100

                is_anomaly = abs(deviation_percent) > self.config.threshold_percent

                if is_anomaly and anomaly_count >= self.config.max_alerts_per_day:
                    is_anomaly = False

                if is_anomaly:
                    anomaly_count += 1

                group_results[metric] = {
                    "is_anomaly": is_anomaly,
                    "deviation_percent": round(deviation_percent, 2),
                    "baseline": round(average, 4),
                }

            results[group_key] = group_results

        return results

    def build_baselines(
        self, history: list[AnomalySnapshot],
    ) -> dict[str, dict[str, dict[str, Any]]]:
        """Build rolling averages from historical snapshots.

        Returns: {group_key: {metric: {average: float, count: int}}}
        """
        accumulator: dict[str, dict[str, list[float]]] = {}

        for snapshot in history:
            if snapshot.group_key not in accumulator:
                accumulator[snapshot.group_key] = {}
            for metric, value in snapshot.metrics.items():
                if metric not in accumulator[snapshot.group_key]:
                    accumulator[snapshot.group_key][metric] = []
                accumulator[snapshot.group_key][metric].append(value)

        baselines: dict[str, dict[str, dict[str, Any]]] = {}
        for group_key, metric_values in accumulator.items():
            baselines[group_key] = {}
            for metric, values in metric_values.items():
                baselines[group_key][metric] = {
                    "average": sum(values) / len(values),
                    "count": len(values),
                }

        return baselines

    def merge_anomaly_columns(
        self,
        original_data: pd.DataFrame,
        anomaly_results: dict[str, dict[str, dict[str, Any]]],
        metrics: list[str],
    ) -> pd.DataFrame:
        result = original_data.copy()

        for metric in metrics:
            result[f"{metric}_is_anomaly"] = False
            result[f"{metric}_deviation_percent"] = 0.0
            result[f"{metric}_baseline"] = 0.0

        result["has_anomaly"] = False

        if self.config.group_by not in result.columns:
            return result

        for index, row in result.iterrows():
            group_key = str(row[self.config.group_by])
            group_results = anomaly_results.get(group_key, {})
            row_has_anomaly = False

            for metric in metrics:
                metric_result = group_results.get(metric, {})
                is_anomaly = metric_result.get("is_anomaly", False)

                result.at[index, f"{metric}_is_anomaly"] = is_anomaly
                result.at[index, f"{metric}_deviation_percent"] = metric_result.get(
                    "deviation_percent", 0.0
                )
                result.at[index, f"{metric}_baseline"] = metric_result.get(
                    "baseline", 0.0
                )

                if is_anomaly:
                    row_has_anomaly = True

            result.at[index, "has_anomaly"] = row_has_anomaly

        return result

    def attach_empty_anomaly_columns(
        self, data: pd.DataFrame, metrics: list[str],
    ) -> pd.DataFrame:
        result = data.copy()
        for metric in metrics:
            result[f"{metric}_is_anomaly"] = False
            result[f"{metric}_deviation_percent"] = 0.0
            result[f"{metric}_baseline"] = 0.0
        result["has_anomaly"] = False
        return result

    def update_field_schemas(
        self, schemas: list[Any] | None,
    ) -> list[Any] | None:
        if not schemas:
            return schemas

        new_schemas = list(schemas)

        for metric in self.config.metrics:
            new_schemas.append(BaseFieldSchema(
                field=f"{metric}_is_anomaly", data_type="boolean",
            ))
            new_schemas.append(BaseFieldSchema(
                field=f"{metric}_deviation_percent", data_type="float",
            ))
            new_schemas.append(BaseFieldSchema(
                field=f"{metric}_baseline", data_type="float",
            ))

        new_schemas.append(BaseFieldSchema(
            field="has_anomaly", data_type="boolean",
        ))

        return new_schemas
