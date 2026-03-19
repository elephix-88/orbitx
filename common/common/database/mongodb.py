from typing import Any

from loguru import logger
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from common.config.settings import get_settings


class MongoDBClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.uri = (
            f"mongodb+srv://{settings.mongo_username}:{settings.mongo_password}"
            f"@{settings.mongo_uri}/{settings.mongo_database}"
        )
        self.db_name = settings.mongo_database
        self.client = AsyncIOMotorClient(
            self.uri,
            maxPoolSize=50,
            minPoolSize=5,
            maxIdleTimeMS=45000,
            connectTimeoutMS=20000,
            serverSelectionTimeoutMS=30000,
            socketTimeoutMS=30000,
            heartbeatFrequencyMS=10000,
            retryWrites=True,
            retryReads=True,
        )
        self.database = self.client[self.db_name]
        logger.info(f"Connected to MongoDB -> Database: '{self.db_name}'")

    async def insert_document(
        self, collection_name: str, data: BaseModel
    ) -> str:
        collection = self.database[collection_name]
        doc = data.model_dump(by_alias=True, exclude_none=True)
        document_id = doc.get("_id")
        if not document_id:
            raise ValueError("Missing _id — must be generated before insert")
        await collection.insert_one(doc)
        return str(document_id)

    async def get_document(
        self,
        collection_name: str,
        query: dict[str, Any] | None = None,
        model_cls: type[BaseModel] | None = None,
    ) -> BaseModel | dict[str, Any] | None:
        collection = self.database[collection_name]
        document = await collection.find_one(query or {})
        if not document:
            return None
        if model_cls:
            return model_cls(**document)
        return document

    async def get_all_documents(
        self,
        collection_name: str,
        query: dict[str, Any] | None = None,
        model_cls: type[BaseModel] | None = None,
    ) -> list[BaseModel] | list[dict[str, Any]]:
        collection = self.database[collection_name]
        cursor = collection.find(query or {})
        documents = await cursor.to_list(length=None)
        logger.info(f"Retrieved {len(documents)} documents from '{collection_name}'")
        if model_cls:
            return [model_cls(**doc) for doc in documents]
        return documents

    async def update_document(
        self,
        collection_name: str,
        query: dict[str, Any],
        data: BaseModel,
        upsert: bool = False,
    ) -> Any:
        collection = self.database[collection_name]
        payload = data.model_dump(
            by_alias=True, exclude_none=True, exclude={"id", "_id"}
        )
        result = await collection.update_one(
            query, {"$set": payload}, upsert=upsert
        )
        return result

    async def delete_document(
        self,
        collection_name: str,
        query: dict[str, Any] | None = None,
    ) -> bool:
        collection = self.database[collection_name]
        result = await collection.delete_one(query or {})
        return result.deleted_count > 0

    async def find_one(
        self,
        collection_name: str,
        id: str,
        model_class: type[BaseModel] | None = None,
    ) -> BaseModel | dict[str, Any] | None:
        return await self.get_document(collection_name, {"_id": id}, model_class)

    async def find_many(
        self,
        collection_name: str,
        field: str,
        values: list[Any],
        model_class: type[BaseModel] | None = None,
    ) -> list[BaseModel] | list[dict[str, Any]]:
        query = {field: {"$in": values}}
        return await self.get_all_documents(collection_name, query, model_class)

    def get_collection(self, collection_name: str):
        """Get a raw Motor collection for direct operations."""
        return self.database[collection_name]

    async def aggregate(
        self,
        collection_name: str,
        pipeline: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        collection = self.database[collection_name]
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)


_mongodb_instance: MongoDBClient | None = None


def get_mongodb() -> MongoDBClient:
    """Get or create the MongoDB client instance."""
    global _mongodb_instance
    if _mongodb_instance is None:
        _mongodb_instance = MongoDBClient()
    return _mongodb_instance
