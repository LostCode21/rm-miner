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
    def __init__(self, timeout: float = 600) -> None:
        self.timeout = timeout

    def clone(self, repository: Repository, workspace: Path) -> CloneResult:
        destination = workspace / repository.name
        if destination.exists():
            if (destination / ".git").exists():
                return CloneResult(repository.name, True)
            return CloneResult(repository.name, False, f"El destino existe y no es un repositorio Git: {destination}")

        try:
            result = subprocess.run(
                ["git", "clone", "--depth", "1", repository.clone_url, str(destination)],
                capture_output=True,
                text=True,
                check=False,
                timeout=self.timeout,
            )
        except subprocess.TimeoutExpired:
            return CloneResult(repository.name, False, f"git clone excedio el limite de {self.timeout} segundos.")
        except OSError as error:
            return CloneResult(repository.name, False, str(error))
        if result.returncode == 0:
            return CloneResult(repository.name, True)

        error = result.stderr.strip() or "git clone fallo sin mensajes de error."
        return CloneResult(repository.name, False, error)
