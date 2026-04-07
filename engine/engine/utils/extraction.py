from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from engine.exceptions import ExtractorException
from engine.utils.logger import execution_timer


@asynccontextmanager
async def extraction_lifecycle(
    label: str,
    source_type: str,
    connection_id: str,
) -> AsyncGenerator[None]:
    async with execution_timer(label):
        try:
            yield
        except ExtractorException:
            raise
        except Exception as error:
            raise ExtractorException(
                f"{label} failed: {error}",
                source_type=source_type,
                details={"connection_id": connection_id},
            ) from error
