"""Adaptador para crear bases de datos y analizar con CodeQL CLI."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import subprocess


@dataclass(frozen=True)
class CodeQLResult:
    success: bool
    stage: str | None = None
    sarif_path: Path | None = None
    error: str | None = None


class CodeQLRunner:
    query_suites = {
        "python": "codeql/python-queries:codeql-suites/python-security-and-quality.qls",
        "javascript-typescript": "codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls",
        "ruby": "codeql/ruby-queries:codeql-suites/ruby-security-and-quality.qls",
    }

    def analyze(self, source: Path, language: str, workdir: Path) -> CodeQLResult:
        workdir.mkdir(parents=True, exist_ok=True)
        database = workdir / f"database-{language}"
        sarif_path = workdir / f"results-{language}.sarif"
        creation = self._run(
            [
                "codeql",
                "database",
                "create",
                str(database),
                f"--language={language}",
                f"--source-root={source}",
            ]
        )
        if creation.returncode != 0:
            return CodeQLResult(False, "database_creation_failed", error=self._error(creation))

        analysis = self._run(
            [
                "codeql",
                "database",
                "analyze",
                str(database),
                self.query_suites[language],
                "--format=sarif-latest",
                f"--output={sarif_path}",
            ]
        )
        if analysis.returncode != 0:
            return CodeQLResult(False, "analysis_failed", error=self._error(analysis))
        return CodeQLResult(True, sarif_path=sarif_path)

    @staticmethod
    def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
        try:
            return subprocess.run(command, capture_output=True, text=True, check=False)
        except OSError as error:
            return subprocess.CompletedProcess(command, 1, "", str(error))

    @staticmethod
    def _error(result: subprocess.CompletedProcess[str]) -> str:
        return result.stderr.strip() or result.stdout.strip() or "CodeQL fallo sin mensajes de error."
