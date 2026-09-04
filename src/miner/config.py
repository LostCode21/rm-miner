"""Carga de configuracion local."""

from __future__ import annotations

import os
from pathlib import Path


class ConfigurationError(ValueError):
    """La configuracion necesaria para ejecutar el comando no existe."""


def load_dotenv(path: Path = Path(".env")) -> None:
    """Carga pares KEY=VALUE de un .env sin reemplazar variables ya definidas."""
    if not path.is_file():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_organization() -> str:
    organization = os.getenv("GITHUB_ORGANIZATION", "").strip()
    if not organization:
        raise ConfigurationError("Falta GITHUB_ORGANIZATION en el archivo .env.")
    return organization
