import pandas as pd
from loguru import logger

from common.model.conditional import (
    Condition,
    ConditionOperator,
    IfNodeConfig,
)


def evaluate_condition(
    dataframe: pd.DataFrame,
    condition: Condition,
) -> pd.Series:
    """Evaluate a single condition against a DataFrame, returning a boolean mask."""
    field = condition.field
    value = condition.value

    if field not in dataframe.columns:
        raise ValueError(
            f"Condition field '{field}' not found in DataFrame. "
            f"Available columns: {list(dataframe.columns)}"
        )

    column = dataframe[field]

    match condition.operator:
        case ConditionOperator.equals:
            return column == value
        case ConditionOperator.not_equals:
            return column != value
        case ConditionOperator.greater_than:
            return column.astype(float) > float(value)
        case ConditionOperator.less_than:
            return column.astype(float) < float(value)
        case ConditionOperator.contains:
            return column.astype(str).str.contains(
                str(value), na=False
            )
        case ConditionOperator.is_empty:
            return column.isna() | (column.astype(str) == "")
        case ConditionOperator.is_not_empty:
            return ~(column.isna() | (column.astype(str) == ""))
        case _:
            raise ValueError(
                f"Unknown operator: {condition.operator}"
            )


class ConditionalRouter:
    """Routes DataFrame rows into 'true' and 'false' outputs based on conditions.

    Evaluates all conditions from IfNodeConfig against the input DataFrame.
    With AND logic, all conditions must be true for a row to go to the 'true'
    output. With OR logic, any one condition suffices.
    """

    def __init__(self, config: IfNodeConfig) -> None:
        self.config = config

    def route(
        self, data: pd.DataFrame
    ) -> dict[str, pd.DataFrame]:
        """Split the DataFrame into 'true' and 'false' subsets.

        Returns {"true": DataFrame, "false": DataFrame} where every row
        appears in exactly one of the two outputs.
        """
        if data.empty:
            logger.info(
                "ConditionalRouter received empty DataFrame"
            )
            return {"true": data.copy(), "false": data.copy()}

        if not self.config.conditions:
            logger.warning(
                "ConditionalRouter has no conditions — "
                "all rows go to 'true'"
            )
            return {
                "true": data.copy(),
                "false": data.head(0),
            }

        masks = [
            evaluate_condition(data, condition)
            for condition in self.config.conditions
        ]

        if self.config.logic == "AND":
            combined_mask = masks[0]
            for mask in masks[1:]:
                combined_mask = combined_mask & mask
        else:
            combined_mask = masks[0]
            for mask in masks[1:]:
                combined_mask = combined_mask | mask

        true_output = data[combined_mask].reset_index(drop=True)
        false_output = data[~combined_mask].reset_index(
            drop=True
        )

        logger.info(
            f"ConditionalRouter: {len(true_output)} rows to "
            f"'true', {len(false_output)} rows to 'false'"
        )

        return {"true": true_output, "false": false_output}
