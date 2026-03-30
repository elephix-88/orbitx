from loguru import logger


async def ensure_indexes(database) -> None:
    logger.info("Ensuring MongoDB indexes...")
    await database["workflow"].create_index("user_id")
    await database["connections"].create_index("user_id")
    await database["execution_history"].create_index("workflow_id")
    await database["execution_history"].create_index(
        [("workflow_id", 1), ("start_time", -1)]
    )
    # TTL index: documents whose ttl_expires_at is set are deleted by MongoDB
    # when the current time exceeds that value (expireAfterSeconds=0 means
    # the ttl_expires_at field itself is the expiry datetime/timestamp).
    # The Dagster hook (F4-DAG-1) sets ttl_expires_at = time.time() + 30*24*3600.
    await database["execution_history"].create_index(
        "ttl_expires_at",
        name="ttl_expires_at_ttl",
        expireAfterSeconds=0,
        sparse=True,  # documents without the field are not affected
    )
    await database["platform_tokens"].create_index("connection_id")
    await database["users"].create_index("email", unique=True)
    await database["users"].create_index("google_id", sparse=True)
    await database["pinned_node_data"].create_index("workflow_id")
    logger.info("MongoDB indexes ensured")
