"""Clonacion de repositorios mediante Git."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import subprocess

from miner.github.client import Repository


@dataclass(frozen=True)
class CloneResult:
    repository: str
    success: bool
    error: str | None = None


class RepositoryCloner:
    def clone(self, repository: Repository, workspace: Path) -> CloneResult:
        destination = workspace / repository.name
        if destination.exists():
            return CloneResult(repository.name, False, f"El destino ya existe: {destination}")

        result = subprocess.run(
            ["git", "clone", "--depth", "1", repository.clone_url, str(destination)],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0:
            return CloneResult(repository.name, True)

        error = result.stderr.strip() or "git clone fallo sin mensajes de error."
        return CloneResult(repository.name, False, error)
