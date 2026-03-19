def build_merge_statement(
    target_table: str, source_table: str, merge_keys: list[str], columns: list[str]
) -> str:
    merge_conditions = " AND ".join(f"T.{key} = S.{key}" for key in merge_keys)

    update_fields = [col for col in columns if col not in merge_keys]
    update_statements = ", ".join(f"{field} = S.{field}" for field in update_fields)

    return f"""
        MERGE `{target_table}` T
        USING `{source_table}` S
        ON {merge_conditions}
        WHEN MATCHED THEN
            UPDATE SET {update_statements}
        WHEN NOT MATCHED THEN
            INSERT ({", ".join(columns)})
            VALUES ({", ".join(f"S.{col}" for col in columns)})
    """
