import time
import traceback
import uuid
from enum import Enum

from loguru import logger

from engine.configs.config import settings
from engine.utils.cost import calculate_cost_usd
from common.database.mongodb import get_mongodb
from common.model.execution import ExecutionHistory, ExecutionStep, Status


class Unit(Enum):
    SECOND = "second"
    MINUTE = "minute"
    HOUR = "hour"


class ExecutionTracker:
    """Unified class for execution timing and optional MongoDB history tracking.

    Can be used as:
    1. Simple timer (track_in_db=False): Just measures and logs execution time
    2. Full tracker (track_in_db=True): Measures time AND tracks execution in MongoDB
    """

    def __init__(
        self,
        label: str = "Execution",
        workflow_id: str | None = None,
        workflow_name: str | None = None,
        triggered_by: str = "manual",
        track_in_db: bool = False,
        collection_name: str | None = None,
    ):
        # Timing attributes
        self.label = label
        self.start_time: float | None = None
        self.end_time: float | None = None

        # MongoDB tracking attributes
        self.track_in_db = track_in_db
        self.workflow_id = workflow_id
        self.workflow_name = workflow_name
        self.triggered_by = triggered_by
        self.execution_id: str | None = None
        self._mongodb_available = False

        # Load MongoDB dependencies if tracking enabled
        if self.track_in_db:
            if not workflow_id or not workflow_name:
                logger.warning(
                    "workflow_id and workflow_name required for DB tracking, disabling"
                )
                self.track_in_db = False
            else:
                try:
                    self.mongodb_client = get_mongodb()
                    self.collection_name = collection_name or settings.get(
                        "execution_history_collection", "execution_history"
                    )
                    self._mongodb_available = True
                except Exception as e:
                    logger.warning(f"MongoDB tracking unavailable: {e}")
                    self.track_in_db = False

    async def start(self) -> str | None:
        """Start timing and optionally start MongoDB tracking.

        Returns:
            str: execution_id if tracking in DB, None otherwise
        """
        self.start_time = time.perf_counter()
        logger.info(f"{self.label} started...")

        if self.track_in_db and self._mongodb_available:
            self.execution_id = f"exec_{uuid.uuid4().hex[:16]}_{int(time.time())}"

            try:
                execution_history = ExecutionHistory(
                    id=self.execution_id,
                    execution_id=self.execution_id,
                    workflow_id=self.workflow_id,
                    workflow_name=self.workflow_name,
                    status=Status.RUNNING,
                    triggered_by=self.triggered_by,
                    start_time=time.time(),
                    end_time=None,
                    duration=None,
                    steps={},
                    error=None,
                    total_nodes=0,
                    successful_nodes=0,
                    failed_nodes=0,
                )

                await self.mongodb_client.insert_document(
                    self.collection_name, execution_history
                )
                logger.info(f"Started tracking execution: {self.execution_id}")

            except Exception as e:
                logger.error(f"Failed to start execution tracking: {e}")
                logger.error(traceback.format_exc())
                self._mongodb_available = False

        return self.execution_id

    async def start_node(
        self,
        node_instance_id: str,
        node_id: str,
        node_type: str,
    ) -> None:
        """Start tracking a node execution (only if track_in_db=True)."""
        if not self.track_in_db or not self._mongodb_available or not self.execution_id:
            return

        try:
            execution = await self.mongodb_client.get_document(
                self.collection_name,
                {"_id": self.execution_id},
                model_cls=ExecutionHistory,
            )

            if not execution:
                logger.warning(f"Execution history not found: {self.execution_id}")
                return

            node_step = ExecutionStep(
                node_instance_id=node_instance_id,
                node_id=node_id,
                node_type=node_type,
                status=Status.RUNNING,
                start_time=time.time(),
                end_time=None,
                error=None,
                error_trace=None,
                message=None,
            )

            execution.steps[node_instance_id] = node_step
            execution.total_nodes += 1

            await self.mongodb_client.update_document(
                self.collection_name,
                {"_id": self.execution_id},
                execution,
            )

            logger.info(f"Started node tracking: {node_id} (#{node_instance_id})")

        except Exception as e:
            logger.error(f"Failed to start node tracking: {e}")
            logger.error(traceback.format_exc())

    async def complete_node(
        self,
        node_instance_id: str,
        success: bool,
        error: Exception | None = None,
        message: str | None = None,
        node_id: str | None = None,
        node_type: str | None = None,
        output: object | None = None,
    ) -> None:
        """Complete node execution tracking (only if track_in_db=True)."""
        if not self.track_in_db or not self._mongodb_available or not self.execution_id:
            return

        try:
            execution = await self.mongodb_client.get_document(
                self.collection_name,
                {"_id": self.execution_id},
                model_cls=ExecutionHistory,
            )

            if not execution:
                logger.warning(f"Execution history not found: {self.execution_id}")
                return

            status = Status.SUCCESS if success else Status.FAILED
            error_message = str(error) if error else None
            error_trace_str = None
            if error:
                error_trace_str = "".join(
                    traceback.format_exception(
                        type(error), error, error.__traceback__
                    )
                )

            if node_instance_id in execution.steps:
                step = execution.steps[node_instance_id]
                step.status = status
                step.end_time = time.time()
                if error_message:
                    step.error = error_message
                if error_trace_str:
                    step.error_trace = error_trace_str
                if message:
                    step.message = message
                if output:
                    step.output = output

                if success:
                    execution.successful_nodes += 1
                else:
                    execution.failed_nodes += 1
            else:
                if node_id and node_type:
                    new_step = ExecutionStep(
                        node_instance_id=node_instance_id,
                        node_id=node_id,
                        node_type=node_type,
                        status=status,
                        start_time=time.time(),
                        end_time=time.time(),
                        error=error_message,
                        error_trace=error_trace_str,
                        message=message,
                        output=output,
                    )
                    execution.steps[node_instance_id] = new_step
                    execution.total_nodes += 1
                    if success:
                        execution.successful_nodes += 1
                    else:
                        execution.failed_nodes += 1
                    logger.warning(
                        f"Created missing step for node #{node_instance_id}"
                    )
                else:
                    logger.warning(
                        f"Step not found for node #{node_instance_id} and no node_id/node_type provided. "
                        "Skipping counter update."
                    )

            await self.mongodb_client.update_document(
                self.collection_name,
                {"_id": self.execution_id},
                execution,
            )

            logger.info(f"Completed node: #{node_instance_id} - {status.value}")

        except Exception as e:
            logger.error(f"Failed to complete node tracking: {e}")
            logger.error(traceback.format_exc())

    async def stop(self, success: bool = True, error: Exception | None = None) -> None:
        """Stop timing and optionally complete MongoDB tracking."""
        self.end_time = time.perf_counter()
        duration = self.elapsed_time

        if duration >= 3600:
            duration_value = duration / 3600
            unit = Unit.HOUR.value
        elif duration >= 60:
            duration_value = duration / 60
            unit = Unit.MINUTE.value
        else:
            duration_value = duration
            unit = Unit.SECOND.value

        status_text = "SUCCESS" if success else "FAILED"
        logger.info(f"{self.label} took {duration_value:.2f} {unit} ({status_text})")

        if self.track_in_db and self._mongodb_available and self.execution_id:
            try:
                execution = await self.mongodb_client.get_document(
                    self.collection_name,
                    {"_id": self.execution_id},
                    model_cls=ExecutionHistory,
                )

                if not execution:
                    logger.warning(
                        f"Execution history not found: {self.execution_id}"
                    )
                    return

                execution.end_time = time.time()
                execution.duration = execution.end_time - execution.start_time
                execution.status = (
                    Status.SUCCESS if success else Status.FAILED
                )
                execution.error = str(error) if error else None

                execution.cost_usd = calculate_cost_usd(execution.duration)
                logger.info(f"Execution cost: ${execution.cost_usd:.6f}")

                await self.mongodb_client.update_document(
                    self.collection_name,
                    {"_id": self.execution_id},
                    execution,
                )

                logger.success(
                    f"Completed execution: {self.execution_id} - {execution.status.value}"
                )

            except Exception as e:
                logger.error(f"Failed to complete execution tracking: {e}")
                logger.error(traceback.format_exc())

    async def complete_execution(
        self, success: bool = True, error: Exception | None = None
    ) -> None:
        """Alias for stop() to maintain compatibility with workflow.py."""
        await self.stop(success=success, error=error)

    @property
    def elapsed_time(self) -> float:
        """Get elapsed time in seconds."""
        if self.start_time is None:
            return 0.0
        end = self.end_time if self.end_time is not None else time.perf_counter()
        return end - self.start_time


# Backward compatibility alias
ExecutionTimer = ExecutionTracker


def log_progress(
    current: int,
    total: int,
    operation_name: str,
    unit: str = "",
    interval: int = 10,
    include_first_last: bool = False,
    failed_count: int = 0,
    is_final: bool = False,
) -> bool:
    """Log progress updates at specified intervals or final success rate summary."""
    if is_final:
        total_attempted = current + failed_count
        success_percentage = (
            (current / total_attempted * 100) if total_attempted > 0 else 0
        )
        logger.info(
            f"{operation_name} Success Rate: {current}/{total_attempted} "
            f"({success_percentage:.1f}%) - Failed: {failed_count}"
        )
        return True
    else:
        should_log = (
            current % interval == 0
            or current == total
            or (include_first_last and current == 1)
        )

        if should_log:
            progress_percentage = (current / total * 100) if total > 0 else 0
            unit_text = f" {unit}" if unit else ""
            logger.info(
                f"{operation_name}: {current}/{total} ({progress_percentage:.1f}%){unit_text}"
            )
            return True

        return False
