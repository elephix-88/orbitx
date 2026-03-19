from engine.node.loaders.bigquery.merge import build_merge_statement


def test_build_merge_statement_basic():
    sql = build_merge_statement(
        target_table="proj.ds.target",
        source_table="proj.ds.source_tmp",
        merge_keys=["id", "date"],
        columns=["id", "date", "name", "value"],
    )

    # Basic shape checks
    assert "MERGE `proj.ds.target` T" in sql
    assert "USING `proj.ds.source_tmp` S" in sql
    assert "ON T.id = S.id AND T.date = S.date" in sql
    assert "UPDATE SET name = S.name, value = S.value" in sql
    assert "INSERT (id, date, name, value)" in sql
    assert "VALUES (S.id, S.date, S.name, S.value)" in sql
