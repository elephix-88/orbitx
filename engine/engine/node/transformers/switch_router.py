import pandas as pd
from loguru import logger

from common.model.conditional import SwitchNodeConfig


class SwitchRouter:
    """Routes DataFrame rows into multiple outputs based on a field's value.

    For each case in SwitchNodeConfig, rows where the switch field equals
    the case value go to that case's output. Rows matching no case go to
    the default output.
    """

    def __init__(self, config: SwitchNodeConfig) -> None:
        self.config = config

    def route(
        self, data: pd.DataFrame
    ) -> dict[str, pd.DataFrame]:
        """Partition the DataFrame by the switch field value.

        Returns a dict keyed by case_id (plus the default_case_id for
        unmatched rows). Every case_id always appears in the output, even
        if the corresponding DataFrame is empty.
        """
        field = self.config.field

        if field not in data.columns:
            raise ValueError(
                f"Switch field '{field}' not found in "
                f"DataFrame. Available columns: "
                f"{list(data.columns)}"
            )

        outputs: dict[str, pd.DataFrame] = {}
        matched_mask = pd.Series(False, index=data.index)

        for case in self.config.cases:
            case_mask = data[field].astype(str) == case.value
            outputs[case.case_id] = data[case_mask].reset_index(
                drop=True
            )
            matched_mask = matched_mask | case_mask

        outputs[self.config.default_case_id] = data[
            ~matched_mask
        ].reset_index(drop=True)

        case_summary = ", ".join(
            f"'{case_id}': {len(df)} rows"
            for case_id, df in outputs.items()
        )
        logger.info(f"SwitchRouter: {case_summary}")

        return outputs
