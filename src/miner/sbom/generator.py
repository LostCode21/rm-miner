"""Adaptador para generar SBOM CycloneDX mediante Syft."""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from miner.models import SbomResult


class SyftRunner:
    def generate(self, full_name: str, source: Path, output: Path) -> SbomResult:
        generated_at = datetime.now(timezone.utc)
        commit = self._commit(source)
        try:
            version = self._version()
            result = subprocess.run(
                ["syft", str(source), "-o", "cyclonedx-json"],
                capture_output=True,
                text=True,
                check=False,
            )
        except OSError as error:
            return SbomResult(
                full_name=full_name,
                commit=commit,
                generated_at=generated_at,
                status="failed",
                error=str(error),
            )

        if result.returncode != 0:
            return SbomResult(
                full_name=full_name,
                commit=commit,
                generated_at=generated_at,
                syft_version=version,
                status="failed",
                error=result.stderr.strip() or "Syft fallo sin mensajes de error.",
            )

        try:
            document = json.loads(result.stdout)
        except json.JSONDecodeError as error:
            return SbomResult(
                full_name=full_name,
                commit=commit,
                generated_at=generated_at,
                syft_version=version,
                status="failed",
                error=f"Syft no genero JSON CycloneDX valido: {error}",
            )

        try:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
        except OSError as error:
            return SbomResult(
                full_name=full_name,
                commit=commit,
                generated_at=generated_at,
                syft_version=version,
                status="failed",
                error=str(error),
            )
        component_count = len(document.get("components", []))
        return SbomResult(
            full_name=full_name,
            commit=commit,
            generated_at=generated_at,
            syft_version=version,
            status="generated" if component_count else "empty",
            component_count=component_count,
            path=str(output),
        )

    @staticmethod
    def _commit(source: Path) -> str | None:
        try:
            result = subprocess.run(
                ["git", "-C", str(source), "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                check=False,
            )
        except OSError:
            return None
        return result.stdout.strip() if result.returncode == 0 else None

    @staticmethod
    def _version() -> str | None:
        result = subprocess.run(
            ["syft", "version", "-o", "json"],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            return None
        try:
            return json.loads(result.stdout).get("version")
        except json.JSONDecodeError:
            return result.stdout.strip() or None
