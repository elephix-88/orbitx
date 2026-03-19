"""Cloud Run cost calculation.

Pricing: asia-southeast1 (Tier 2)
- CPU: $0.00003360 per vCPU-second
- Memory: $0.00000350 per GiB-second

Default config: 2 vCPU, 4 GiB
Cost per second = (2 × 0.00003360) + (4 × 0.00000350) = $0.0000812
"""

# Cost per second for 2 vCPU + 4 GiB in asia-southeast1
COST_PER_SECOND = 0.0000812


def calculate_cost_usd(duration_seconds: float) -> float:
    """Calculate Cloud Run execution cost.

    Args:
        duration_seconds: Execution duration in seconds

    Returns:
        Cost in USD (minimum 1 minute billing)
    """
    # Cloud Run Jobs minimum billing is 1 minute
    billable_seconds = max(duration_seconds, 60.0)
    return round(billable_seconds * COST_PER_SECOND, 6)
