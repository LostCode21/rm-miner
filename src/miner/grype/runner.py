"""Adaptador para analizar vulnerabilidades con Grype a partir de un SBOM."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from miner.models import GrypeResult, Vulnerability


class GrypeRunner:
    def __init__(self, timeout: float = 600) -> None:
        self.timeout = timeout

    def scan(self, sbom_path: Path) -> GrypeResult:
        try:
            version = self._version()
            result = subprocess.run(
                ["grype", f"sbom:{sbom_path}", "-o", "json"],
                capture_output=True,
                text=True,
                check=False,
                timeout=self.timeout,
            )
        except subprocess.TimeoutExpired:
            return GrypeResult(
                status="failed",
                error=f"Grype excedio el limite de {self.timeout} segundos.",
            )
        except OSError as error:
            return GrypeResult(status="failed", error=str(error))

        if result.returncode != 0:
            return GrypeResult(
                status="failed",
                version=version,
                error=result.stderr.strip() or "Grype fallo sin mensajes de error.",
            )

        try:
            document = json.loads(result.stdout)
        except json.JSONDecodeError as error:
            return GrypeResult(
                status="failed",
                version=version,
                error=f"Grype no genero JSON valido: {error}",
            )

        vulnerabilities = [_to_vulnerability(match) for match in document.get("matches", [])]
        return GrypeResult(
            status="analyzed",
            version=version,
            vulnerability_count=len(vulnerabilities),
            vulnerabilities=vulnerabilities,
        )

    def _version(self) -> str | None:
        try:
            result = subprocess.run(
                ["grype", "version", "-o", "json"],
                capture_output=True,
                text=True,
                check=False,
                timeout=self.timeout,
            )
        except (OSError, subprocess.TimeoutExpired):
            return None
        if result.returncode != 0:
            return None
        try:
            return json.loads(result.stdout).get("version")
        except json.JSONDecodeError:
            return result.stdout.strip() or None


def _to_vulnerability(match: dict) -> Vulnerability:
    vulnerability = match.get("vulnerability") or {}
    artifact = match.get("artifact") or {}
    locations = artifact.get("locations") or []
    location = locations[0].get("path") if locations else None
    fixed_versions = (vulnerability.get("fix") or {}).get("versions") or []
    return Vulnerability(
        id=vulnerability.get("id", "unknown"),
        severity=vulnerability.get("severity"),
        package=artifact.get("name", "unknown"),
        version=artifact.get("version"),
        fixed_version=", ".join(fixed_versions) if fixed_versions else None,
        artifact_type=artifact.get("type"),
        location=location,
        message=vulnerability.get("description", "") or "",
    )
