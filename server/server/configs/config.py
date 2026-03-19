import os
from pathlib import Path

from dynaconf import Dynaconf

CONFIG_FILES = ["configs/settings.yaml", "configs/facebook.yaml", "configs/tiktok.yaml"]

# Find .env at monorepo root (one level up from server/)
MONOREPO_ROOT = Path(__file__).resolve().parents[3]
DOTENV_PATH = MONOREPO_ROOT / ".env"

settings = Dynaconf(
    envvar_prefix=False,
    settings_files=[C for C in CONFIG_FILES if os.path.isfile(C)],
    environments=True,
    ignore_unknown_envvars=True,
    load_dotenv=True,
    dotenv_path=str(DOTENV_PATH),
)
