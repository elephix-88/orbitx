
import pandas as pd
from loguru import logger

from engine.configs.config import settings
from engine.node.extractors.facebook_ads.api.client import parse_batch_item, post_batch
from engine.node.extractors.facebook_ads.utils import generate_batch_tag
from engine.utils.logger import log_progress
from engine.utils.utils import ProgressCounter, chunked
from common.model.facebook.fields import FacebookField as FieldConfig
from common.model.facebook.request import BatchPlan


class PostProcessing:
    def __init__(self, batch_results: dict):
        self.batch_results = batch_results

    def _build_metadata_batch(
        self, ids: list[str], post_process_fields: list[str], batch_no: int
    ) -> list[dict]:
        return [
            BatchPlan(
                method="GET",
                relative_url=f"{item_id}?fields={','.join(post_process_fields)}",
                tag=str(batch_no * 1000000 + idx),
            ).model_dump()
            for idx, item_id in enumerate(ids, 1)
        ]

    async def _run_batch(self, access_token: str, batch: list[dict]) -> list[dict]:
        return await post_batch(
            access_token=access_token,
            batch_items=batch,
            timeout=settings.request_timeout,
        )

    def _parse_rows(
        self, raw_items: list[dict], batch_no: int, endpoint_type: str
    ) -> list[dict]:
        rows: list[dict] = []
        for idx, item in enumerate(raw_items, 1):
            parsed = parse_batch_item(
                item,
                BatchPlan(method="GET", relative_url="", tag=str(idx)),
                batch_no,
                idx,
            )
            if getattr(parsed, "type", "") == "error":
                logger.warning(
                    f"Failed to parse {endpoint_type} data in batch {batch_no} item {idx}"
                )
                continue
            data = getattr(parsed, "data", None)
            if data:
                rows.extend(data if isinstance(data, list) else [data])
        return rows

    def _update_results(
        self, endpoint_type: str, batch_no: int, rows: list[dict]
    ) -> str:
        tag = generate_batch_tag(endpoint_type, batch_no)
        self.batch_results.setdefault("data_by_tag", {})[tag] = rows
        return tag

    async def get_campaigns(
        self,
        insights_data: list[dict],
        access_token: str,
        post_process_fields: list[str],
    ) -> tuple[list[str], dict]:
        """Get campaign metadata for post-processing"""
        return await self._get_metadata(
            insights_data, access_token, "campaign", "campaigns", post_process_fields
        )

    async def _get_metadata(
        self,
        insights_data: list[dict],
        access_token: str,
        id_type: str,
        endpoint_type: str,
        post_process_fields: list[str],
    ) -> tuple[list[str], dict]:
        """Generic method to get metadata for any endpoint type"""
        id_field = f"{id_type}_id"
        unique_ids = {
            str(row.get(id_field)) for row in insights_data if row.get(id_field)
        }
        logger.info(f"Found {len(unique_ids)} unique {id_field}s")

        if not unique_ids:
            logger.warning(f"No {id_field} found in data.")
            return [], self.batch_results

        batch_filepaths, self.batch_results = await self._fetch_metadata(
            unique_ids, access_token, endpoint_type, post_process_fields
        )
        return batch_filepaths, self.batch_results

    async def _fetch_metadata(
        self,
        ids: set,
        access_token: str,
        endpoint_type: str,
        post_process_fields: list[str],
    ) -> tuple[list[str], dict]:
        """Generic method to fetch metadata for any endpoint type"""
        batch_size = settings.batch_size
        ids_list = list(ids)
        batch_filepaths = []
        total_batches = (len(ids_list) + batch_size - 1) // batch_size

        logger.info(f"Endpoint type: {endpoint_type}")
        logger.info(f"Total post_process_fields: {len(post_process_fields)}")
        logger.info(f"Field names to fetch: {post_process_fields}")
        logger.info(
            f"Processing {len(ids_list)} {endpoint_type} in {total_batches} batches"
        )

        progress = ProgressCounter(total=total_batches)
        for i, chunk in enumerate(chunked(ids_list, batch_size), start=1):
            batch_no = i
            batch = self._build_metadata_batch(
                list(chunk), post_process_fields, batch_no
            )

            log_progress(
                batch_no,
                total_batches,
                f"Fetching {endpoint_type}",
                "",
                interval=5,
                include_first_last=True,
            )

            try:
                raw_items = await self._run_batch(access_token, batch)
                rows = self._parse_rows(raw_items, batch_no, endpoint_type)
                tag = self._update_results(endpoint_type, batch_no, rows)
                batch_filepaths.append(tag)
                progress.mark_success()
            except Exception as e:
                progress.mark_failed()
                logger.warning(f"Batch {batch_no} failed: {e}")

        log_progress(
            progress.success,
            progress.total,
            f"Post-processing ({endpoint_type})",
            failed_count=progress.failed,
            is_final=True,
        )
        logger.info(
            f"Collected {len(batch_filepaths)} {endpoint_type} batches in memory"
        )
        return batch_filepaths, self.batch_results

    async def get_ads(
        self,
        insights_data: list[dict],
        access_token: str,
        post_process_fields: list[str],
    ) -> tuple[list[str], dict]:
        """Get ads metadata for post-processing"""
        return await self._get_metadata(
            insights_data, access_token, "ad", "ads", post_process_fields
        )


def normalize_data(
    data: list[dict], field_config: list[FieldConfig], endpoint_name: str
) -> pd.DataFrame:
    relevant_fields = [
        f
        for f in field_config
        if hasattr(f.endpoints, endpoint_name) and getattr(f.endpoints, endpoint_name)
    ]

    regular_fields = []
    creative_fields = []

    for f in relevant_fields:
        endpoint_field = getattr(f.endpoints, endpoint_name)
        if endpoint_field.startswith("creative{") and endpoint_field.endswith("}"):
            creative_fields.append(f)
        else:
            regular_fields.append(f)

    rename_map = {getattr(f.endpoints, endpoint_name): f.field for f in regular_fields}

    df = pd.DataFrame(data)

    for f in creative_fields:
        endpoint_field = getattr(f.endpoints, endpoint_name)
        creative_field = endpoint_field[9:-1]

        df[f.field] = df.get("creative", pd.Series([{}] * len(df))).apply(
            lambda x: x.get(creative_field) if isinstance(x, dict) else None
        )

    df = df.rename(columns=rename_map)
    df = df.drop(columns=["creative"], errors="ignore")

    return df
