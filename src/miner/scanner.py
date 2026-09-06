"""Orquestacion del escaneo de una organizacion."""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from tempfile import TemporaryDirectory

from miner.codeql.runner import CodeQLRunner
from miner.github.client import GitHubClient, Repository
from miner.language.detector import supported_languages
from miner.models import OrganizationResult, RepositoryResult, build_summary
from miner.repository.cloner import RepositoryCloner
from miner.sarif.parser import parse_sarif

Progress = Callable[[str], None]


class OrganizationScanner:
    def __init__(
        self,
        client: GitHubClient,
        cloner: RepositoryCloner | None = None,
        codeql: CodeQLRunner | None = None,
    ) -> None:
        self.client = client
        self.cloner = cloner or RepositoryCloner()
        self.codeql = codeql or CodeQLRunner()

    def scan(self, organization: str, progress: Progress | None = None) -> OrganizationResult:
        report = progress or (lambda _: None)
        repositories = self.client.list_repositories(organization)
        results: list[RepositoryResult] = []
        with TemporaryDirectory(prefix="rm-miner-") as temporary_directory:
            workspace = Path(temporary_directory)
            for index, repository in enumerate(repositories, start=1):
                results.append(self._scan_repository(organization, repository, workspace, index, len(repositories), report))
        return OrganizationResult(
            organization=organization,
            repositories=results,
            summary=build_summary(organization, results),
        )

    def _scan_repository(
        self,
        organization: str,
        repository: Repository,
        workspace: Path,
        index: int,
        total: int,
        report: Progress,
    ) -> RepositoryResult:
        report(f"[{index}/{total}] {repository.name}: detectando lenguajes")
        try:
            languages = self.client.list_languages(organization, repository.name)
        except Exception as error:
            report(f"[{index}/{total}] {repository.name}: ERROR: {error}")
            return RepositoryResult(name=repository.name, status="analysis_failed", error=str(error))

        targets = supported_languages(languages)
        if not targets:
            report(f"[{index}/{total}] {repository.name}: no soportado")
            return RepositoryResult(name=repository.name, status="unsupported", languages=languages)

        report(f"[{index}/{total}] {repository.name}: clonando")
        clone = self.cloner.clone(repository, workspace)
        if not clone.success:
            report(f"[{index}/{total}] {repository.name}: ERROR: {clone.error}")
            return RepositoryResult(
                name=repository.name,
                status="clone_failed",
                languages=languages,
                analyzed_languages=[target.name for target in targets],
                error=clone.error,
            )

        findings = []
        errors: list[tuple[str, str]] = []
        for target in targets:
            report(f"[{index}/{total}] {repository.name}: analizando {target.name}")
            result = self.codeql.analyze(
                workspace / repository.name,
                target.codeql_name,
                workspace / ".codeql" / repository.name,
            )
            if not result.success:
                errors.append((result.stage or "analysis_failed", result.error or "Error desconocido."))
                report(f"[{index}/{total}] {repository.name}: ERROR: {errors[-1][1]}")
                continue
            if result.sarif_path is None:
                errors.append(("analysis_failed", "CodeQL no genero un archivo SARIF."))
                report(f"[{index}/{total}] {repository.name}: ERROR: {errors[-1][1]}")
                continue
            findings.extend(parse_sarif(result.sarif_path, target.name))

        if errors:
            status = "database_creation_failed" if any(stage == "database_creation_failed" for stage, _ in errors) else "analysis_failed"
            return RepositoryResult(
                name=repository.name,
                status=status,
                languages=languages,
                analyzed_languages=[target.name for target in targets],
                findings=sorted(findings, key=lambda finding: (finding.file or "", finding.start_line or 0, finding.rule_id)),
                error="; ".join(error for _, error in errors),
            )

        report(f"[{index}/{total}] {repository.name}: analizado")
        return RepositoryResult(
            name=repository.name,
            status="analyzed",
            languages=languages,
            analyzed_languages=[target.name for target in targets],
            findings=sorted(findings, key=lambda finding: (finding.file or "", finding.start_line or 0, finding.rule_id)),
        )
