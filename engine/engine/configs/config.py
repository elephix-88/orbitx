from pathlib import Path

from dynaconf import Dynaconf

# Resolve config paths relative to the engine package root (engine/),
# not the current working directory. This ensures configs are found
# regardless of which service imports the engine package.
ENGINE_PACKAGE_ROOT = Path(__file__).resolve().parents[2]

CONFIG_FILES = [
    str(ENGINE_PACKAGE_ROOT / "configs" / "settings.yaml"),
    str(ENGINE_PACKAGE_ROOT / "configs" / "services.yaml"),
    str(ENGINE_PACKAGE_ROOT / "configs" / "facebook.yaml"),
    str(ENGINE_PACKAGE_ROOT / "configs" / "google.yaml"),
    str(ENGINE_PACKAGE_ROOT / "configs" / "tiktok.yaml"),
]

# Find .env at monorepo root (one level up from engine/)
MONOREPO_ROOT = ENGINE_PACKAGE_ROOT.parent
DOTENV_PATH = MONOREPO_ROOT / ".env"

settings = Dynaconf(
    envvar_prefix=False,
    load_dotenv=True,
    dotenv_path=str(DOTENV_PATH),
    settings_files=[f for f in CONFIG_FILES if Path(f).is_file()],
    environments=True,
)
