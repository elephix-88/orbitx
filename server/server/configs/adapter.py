from common.config.settings import register_settings
from server.configs.config import settings as app_settings


def _validate_required_secrets():
    """Validate that critical security secrets are configured."""
    errors = []

    if not app_settings.get("jwt_secret"):
        errors.append("jwt_secret is required (set via JWT_SECRET env var)")

    if not app_settings.get("oauth_state_secret"):
        errors.append(
            "oauth_state_secret is required (set via OAUTH_STATE_SECRET env var)"
        )

    if errors:
        raise ValueError(f"Missing required configuration: {'; '.join(errors)}")


def init_settings():
    _validate_required_secrets()
    register_settings(app_settings)
