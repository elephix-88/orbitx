import base64
import hashlib
import hmac
import json
import secrets
import time

from server.configs.config import settings


def make_state(
    connection_type: str,
    connection_id: str,
    service_name: str,
    connection_name: str,
    user_id: str | None = None,
) -> str:
    secret = settings.oauth_state_secret.encode()
    payload = {
        "t": connection_type,
        "cid": connection_id,
        "svc": service_name,
        "cn": connection_name,
        "uid": user_id,  # Add user_id to state
        "nonce": secrets.token_urlsafe(8),
        "ts": int(time.time()),
    }
    raw = json.dumps(payload, separators=(",", ":")).encode()
    sig = hmac.new(secret, raw, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(raw + b"." + sig).decode().rstrip("=")


def verify_state(state: str, max_age: int = 600) -> dict[str, str]:
    secret = settings.oauth_state_secret.encode()

    # Add padding back to the state string
    state += "=" * (-len(state) % 4)

    try:
        blob = base64.urlsafe_b64decode(state)
        # SHA256 signature is always 32 bytes, plus 1 byte for the dot separator
        if len(blob) < 34:
            raise ValueError("Invalid state format")
        raw = blob[:-33]  # Everything except last 33 bytes (1 dot + 32 sig)
        sig = blob[-32:]  # Last 32 bytes is the signature
    except (ValueError, TypeError):
        raise ValueError("Invalid state format")

    expected_sig = hmac.new(secret, raw, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("Invalid state signature")

    data = json.loads(raw.decode())
    ts = data.get("ts", 0)
    if abs(time.time() - ts) > max_age:
        raise ValueError("State expired")

    return {
        "connection_type": data["t"],
        "connection_id": data["cid"],
        "service_name": data.get("svc"),
        "connection_name": data.get("cn"),
        "user_id": data.get("uid"),
    }
