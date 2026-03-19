import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from google.cloud import pubsub_v1  # type: ignore[attr-defined]
from loguru import logger

from common.model.execution import NodeStatusEvent
from server.configs.config import settings


class SSEManager:
    """
    Server-Sent Events manager with proper cleanup to prevent memory leaks.

    Uses a dictionary with connection IDs for O(1) removal and ensures
    cleanup happens in all cases (normal disconnect, error, cancellation).
    """

    def __init__(self):
        # Use dict for O(1) add/remove operations
        # Key: unique connection id, Value: (workflow_id, queue)
        self._connections: dict[int, tuple[str, asyncio.Queue[str]]] = {}
        self._connection_counter = 0

    @asynccontextmanager
    async def _managed_connection(self, workflow_id: str):
        """Context manager to ensure connection cleanup."""
        queue: asyncio.Queue[str] = asyncio.Queue()
        conn_id = self._connection_counter
        self._connection_counter += 1

        self._connections[conn_id] = (workflow_id, queue)
        logger.info(
            "SSE client connected",
            workflow_id=workflow_id,
            conn_id=conn_id,
            total_clients=len(self._connections),
        )

        try:
            yield queue
        finally:
            # Always cleanup, regardless of how we exit
            self._connections.pop(conn_id, None)
            logger.info(
                "SSE client disconnected",
                workflow_id=workflow_id,
                conn_id=conn_id,
                remaining_clients=len(self._connections),
            )

    async def connect(self, workflow_id: str) -> AsyncGenerator[str]:
        """Connect a client and yield SSE events."""
        async with self._managed_connection(workflow_id) as queue:
            try:
                while True:
                    data = await queue.get()
                    yield f"data: {data}\n\n"
            except asyncio.CancelledError:
                # Normal disconnect - cleanup handled by context manager
                pass
            except Exception as e:
                logger.error(
                    "Error in SSE connection", workflow_id=workflow_id, error=str(e)
                )

    async def broadcast(self, message: str, workflow_id: str):
        """Broadcast message only to clients subscribed to the specific workflow."""
        count = 0
        # Iterate over a copy to avoid modification during iteration
        for conn_id, (wid, queue) in list(self._connections.items()):
            if wid == workflow_id:
                try:
                    await queue.put(message)
                    count += 1
                except Exception as e:
                    logger.warning(
                        "Failed to send to client",
                        conn_id=conn_id,
                        error=str(e),
                    )
        if count > 0:
            logger.debug(
                "Broadcasted message",
                workflow_id=workflow_id,
                client_count=count,
            )

    @property
    def connection_count(self) -> int:
        """Get the current number of active connections."""
        return len(self._connections)


sse_manager = SSEManager()


async def process_message(message):
    """Process a Pub/Sub message for workflow execution tracking.

    SSE broadcast only - execution_history collection (written by ExecutionTracker
    in workflow engine) is the single source of truth for persistence.
    """
    try:
        data = message.data.decode("utf-8")
        event = NodeStatusEvent.model_validate_json(data)

        # SSE Push - broadcast to connected clients for real-time UI updates
        await sse_manager.broadcast(data, event.workflow_id)

        message.ack()
    except Exception as e:
        logger.error("Error processing Pub/Sub message", error=str(e))
        message.nack()


async def start_consumer():
    """Start the Pub/Sub consumer for workflow execution tracking."""
    streaming_pull_future = None
    try:
        if not settings.enable_tracking:
            logger.info("Tracking disabled, skipping consumer startup")
            return

        project_id = settings.google_cloud_project_id
        subscription_id = settings.pubsub_subscription_id

        logger.info(
            "Starting Pub/Sub consumer",
            project_id=project_id,
            subscription_id=subscription_id,
        )

        subscriber = pubsub_v1.SubscriberClient()
        subscription_path = subscriber.subscription_path(project_id, subscription_id)

        # Store reference to the main event loop
        loop = asyncio.get_running_loop()

        def callback(message):
            # Use the stored main loop instead of trying to get it from the thread
            # Fire and forget - process_message handles ack/nack
            asyncio.run_coroutine_threadsafe(process_message(message), loop)

        streaming_pull_future = subscriber.subscribe(
            subscription_path, callback=callback
        )
        logger.info(
            "Listening for Pub/Sub messages", subscription_path=subscription_path
        )

        # Keep the consumer running in the background
        await asyncio.Future()  # Run forever
    except Exception as e:
        logger.error("Consumer failed to start", error=str(e), exc_info=True)
        if streaming_pull_future is not None:
            streaming_pull_future.cancel()
