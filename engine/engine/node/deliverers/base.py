from datetime import datetime
from typing import Protocol

import pandas as pd


class Deliverer(Protocol):
    """Protocol for delivering workflow results to external channels."""

    async def deliver(
        self,
        data: pd.DataFrame,
        workflow_name: str,
        execution_time: datetime,
        include_ai_summary: bool = False,
    ) -> bool:
        """Deliver workflow results to the configured channel.

        Args:
            data: The final DataFrame from the workflow pipeline.
            workflow_name: Name of the workflow that produced this data.
            execution_time: When the workflow execution started.
            include_ai_summary: Whether to prepend a Pulse AI summary (Slack only).

        Returns:
            True if delivery succeeded, False otherwise.
        """
        ...
