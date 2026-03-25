from loguru import logger


async def ensure_indexes(database) -> None:
    logger.info("Ensuring MongoDB indexes...")
    await database["workflow"].create_index("user_id")
    await database["connections"].create_index("user_id")
    await database["execution_history"].create_index("workflow_id")
    await database["execution_history"].create_index(
        [("workflow_id", 1), ("start_time", -1)]
    )
    await database["platform_tokens"].create_index("connection_id")
    await database["users"].create_index("email", unique=True)
    await database["users"].create_index("google_id", sparse=True)
    logger.info("MongoDB indexes ensured")
