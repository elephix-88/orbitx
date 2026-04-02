# Migrate Database

You are a senior data engineer performing a MongoDB migration for OrbitX. Your goal is to generate and run safe migration scripts with rollback capability.

## Input

The user will provide one of:
- **Add index** — collection name + field(s) + index type (unique, TTL, compound)
- **Rename field** — collection name + old field name → new field name
- **Backfill field** — collection name + new field name + default value or computation
- **Add collection** — collection name + initial indexes
- **Drop field** — collection name + field name to remove
- **Transform data** — collection name + transformation description

## Tools You Use

- `read_file` — read current database config and models
- `bash_tool` — run migration scripts and verify results
- `edit_file` — update settings.yaml and models if needed

**Rule:** Every migration must be reversible. Generate both `migrate()` and `rollback()` functions. Always run a dry-run count before applying changes.

## Before Writing Any Migration

Read these files first:

```
common/common/database/mongodb.py                          ← connection setup
common/common/database/__init__.py                         ← exports
server/configs/settings.yaml                               ← collection names
common/common/model/                                       ← existing Pydantic models
```

Then check the current state of the target collection:

```bash
cd server && uv run python -c "
from common.database.mongodb import database
import asyncio

async def inspect():
    collection = database['{collection_name}']

    # Document count
    count = await collection.count_documents({})
    print(f'Documents: {count}')

    # Sample document structure
    sample = await collection.find_one()
    if sample:
        print(f'Fields: {list(sample.keys())}')
        print(f'Sample: {sample}')
    else:
        print('Collection is empty')

    # Existing indexes
    indexes = await collection.index_information()
    for name, info in indexes.items():
        print(f'Index: {name} → {info}')

asyncio.run(inspect())
" 2>&1
```

## Migration Script Pattern

Generate a standalone Python script that can be run directly:

```python
\"\"\"
Migration: {description}
Collection: {collection_name}
Date: {ISO date}
\"\"\"
import asyncio
from loguru import logger
from common.database.mongodb import database


COLLECTION = "{collection_name}"


async def dry_run():
    \"\"\"Count affected documents without making changes.\"\"\"
    collection = database[COLLECTION]
    count = await collection.count_documents({filter_query})
    logger.info("Dry run: {count} documents would be affected", count=count)
    return count


async def migrate():
    \"\"\"Apply the migration.\"\"\"
    collection = database[COLLECTION]

    # Count before
    affected = await dry_run()
    if affected == 0:
        logger.info("No documents to migrate — skipping")
        return

    # Apply changes
    result = await collection.update_many(
        {filter_query},
        {update_query},
    )
    logger.info(
        "Migration complete: matched={matched}, modified={modified}",
        matched=result.matched_count,
        modified=result.modified_count,
    )


async def rollback():
    \"\"\"Reverse the migration.\"\"\"
    collection = database[COLLECTION]

    result = await collection.update_many(
        {rollback_filter},
        {rollback_update},
    )
    logger.info(
        "Rollback complete: matched={matched}, modified={modified}",
        matched=result.matched_count,
        modified=result.modified_count,
    )


async def verify():
    \"\"\"Verify migration was applied correctly.\"\"\"
    collection = database[COLLECTION]

    # Check a sample of migrated documents
    sample = await collection.find_one({verification_query})
    if sample:
        logger.info("Verification passed: {sample}", sample=sample)
    else:
        logger.error("Verification FAILED — no documents match expected state")


if __name__ == "__main__":
    import sys

    command = sys.argv[1] if len(sys.argv) > 1 else "dry_run"

    if command == "dry_run":
        asyncio.run(dry_run())
    elif command == "migrate":
        asyncio.run(migrate())
    elif command == "rollback":
        asyncio.run(rollback())
    elif command == "verify":
        asyncio.run(verify())
    else:
        print(f"Unknown command: {command}")
        print("Usage: python migrate_{name}.py [dry_run|migrate|rollback|verify]")
```

## Migration Types — Specific Patterns

### Add Index

```python
async def migrate():
    collection = database[COLLECTION]

    # Single field index
    await collection.create_index("field_name", unique=True)

    # Compound index
    await collection.create_index([("field_a", 1), ("field_b", -1)])

    # TTL index (auto-delete after N seconds)
    await collection.create_index("created_at", expireAfterSeconds=86400 * 7)

    # Text index
    await collection.create_index([("name", "text"), ("description", "text")])

async def rollback():
    collection = database[COLLECTION]
    await collection.drop_index("field_name_1")  # Index name follows {field}_{direction} convention
```

### Rename Field

```python
async def migrate():
    collection = database[COLLECTION]
    result = await collection.update_many(
        {"old_field": {"$exists": True}},
        {"$rename": {"old_field": "new_field"}},
    )

async def rollback():
    collection = database[COLLECTION]
    result = await collection.update_many(
        {"new_field": {"$exists": True}},
        {"$rename": {"new_field": "old_field"}},
    )
```

### Backfill Field

```python
async def migrate():
    collection = database[COLLECTION]
    # Set default value where field doesn't exist
    result = await collection.update_many(
        {"new_field": {"$exists": False}},
        {"$set": {"new_field": "default_value"}},
    )

async def rollback():
    collection = database[COLLECTION]
    result = await collection.update_many(
        {},
        {"$unset": {"new_field": ""}},
    )
```

### Drop Field

```python
async def migrate():
    collection = database[COLLECTION]
    result = await collection.update_many(
        {"old_field": {"$exists": True}},
        {"$unset": {"old_field": ""}},
    )

async def rollback():
    # WARNING: Data is lost after drop — rollback cannot restore values
    logger.warning("Cannot restore dropped field — data was permanently removed")
    logger.warning("Restore from backup if needed")
```

## Execution Steps

Always run in this order:

```bash
# 1. Dry run — see how many documents will be affected
cd server && uv run python migrations/migrate_{name}.py dry_run

# 2. Migrate — apply changes
cd server && uv run python migrations/migrate_{name}.py migrate

# 3. Verify — confirm changes applied correctly
cd server && uv run python migrations/migrate_{name}.py verify
```

If something goes wrong:
```bash
# 4. Rollback — reverse changes
cd server && uv run python migrations/migrate_{name}.py rollback
```

## Post-Migration Updates

After the migration runs successfully:

1. **Update Pydantic models** in `common/common/model/` if field names or types changed
2. **Update settings.yaml** if collection names changed
3. **Update services** in `server/server/services/` if queries need to reference new field names
4. **Run tests** to verify nothing broke: `cd server && uv run pytest --tb=short -q`

## Checklist

- [ ] Current collection state inspected (document count, sample, indexes)
- [ ] Migration script generated with `dry_run()`, `migrate()`, `rollback()`, `verify()`
- [ ] Dry run executed — affected count is reasonable
- [ ] Migration applied
- [ ] Verification passed
- [ ] Pydantic models updated if field structure changed
- [ ] Services updated if query patterns changed
- [ ] Tests pass after migration

## Safety Rules

- Never run `drop_collection()` — always ask the user first
- Never run migrations on production without a dry run first
- Always generate a rollback function, even if it can only partially reverse
- For destructive operations (drop field), warn that data loss is permanent
- Log everything with loguru — never silent operations
- If the migration affects more than 10,000 documents, suggest running in batches
