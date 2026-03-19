def clean_account_id(account: str) -> str:
    """Normalize Facebook ad account id to numeric part (strip act_ prefix)."""
    try:
        return account.replace("act_", "") if account else account
    except Exception:
        return account


def generate_batch_tag(
    endpoint_type: str, batch_no: int, account_id: str | None = None
) -> str:
    """Generate a stable tag for batch requests.

    Format: fb_{endpoint_type}_batch_{account?}_{no:03d}
    """
    if account_id:
        aid = clean_account_id(account_id)
        return f"fb_{endpoint_type}_batch_{aid}_{batch_no:03d}"
    return f"fb_{endpoint_type}_batch_{batch_no:03d}"
