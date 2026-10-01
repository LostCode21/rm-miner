"""Orquestacion del escaneo de una organizacion."""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from miner.codeql.runner import CodeQLRunner
from miner.github.client import GitHubClient, Repository
from miner.grype.runner import GrypeRunner
from miner.language.detector import supported_languages
from miner.models import (
    GrypeResult,
    OrganizationResult,
    RepositoryResult,
    SbomResult,
    build_findings,
    build_summary,
)
from miner.repository.cloner import RepositoryCloner
from miner.sarif.parser import parse_sarif
from miner.sbom.generator import SyftRunner

Progress = Callable[[str], None]


class OrganizationScanner:
    def __init__(
        self,
        client: GitHubClient,
        cloner: RepositoryCloner | None = None,
        codeql: CodeQLRunner | None = None,
        syft: SyftRunner | None = None,
        grype: GrypeRunner | None = None,
    ) -> None:
        self.client = client
        self.cloner = cloner or RepositoryCloner()
        self.codeql = codeql or CodeQLRunner()
        self.syft = syft or SyftRunner()
        self.grype = grype or GrypeRunner()

    def scan(
        self,
        organization: str,
        workspace: Path,
        progress: Progress | None = None,
        limit: int | None = None,
        sbom_output_dir: Path | None = None,
        codeql_workspace: Path | None = None,
    ) -> OrganizationResult:
        report = progress or (lambda _: None)
        report(f"Obteniendo repositorios de {organization}")
        repositories = self.client.list_repositories(organization)
        if limit is not None:
            repositories = repositories[:limit]
        results: list[RepositoryResult] = []
        for index, repository in enumerate(repositories, start=1):
            results.append(
                self._scan_repository(
                    organization,
                    repository,
                    workspace,
                    sbom_output_dir or workspace / "sboms",
                    codeql_workspace or workspace / ".codeql",
                    index,
                    len(repositories),
                    report,
                )
            )
        return OrganizationResult(
            organization=organization,
            repositories=results,
            findings=build_findings(organization, results),
            summary=build_summary(organization, results),
        )

    def _scan_repository(
        self,
        organization: str,
        repository: Repository,
        workspace: Path,
        sbom_output_dir: Path,
        codeql_workspace: Path,
        index: int,
        total: int,
        report: Progress,
    ) -> RepositoryResult:
        report(f"[{index}/{total}] {repository.name}: clonando")
        clone = self.cloner.clone(repository, workspace)
        if not clone.success:
            report(f"[{index}/{total}] {repository.name}: ERROR: {clone.error}")
            return RepositoryResult(name=repository.name, status="clone_failed", error=clone.error)

        report(f"[{index}/{total}] {repository.name}: generando SBOM")
        sbom = self.syft.generate(
            f"{organization}/{repository.name}",
            workspace / repository.name,
            sbom_output_dir / f"{repository.name}.cdx.json",
        )
        if sbom.status == "failed":
            report(f"[{index}/{total}] {repository.name}: ERROR SBOM: {sbom.error}")

        report(f"[{index}/{total}] {repository.name}: analizando dependencias con Grype")
        grype = self._analyze_dependencies(sbom)
        if grype.status == "failed":
            report(f"[{index}/{total}] {repository.name}: ERROR Grype: {grype.error}")

        report(f"[{index}/{total}] {repository.name}: detectando lenguajes")
        try:
            languages = self.client.list_languages(organization, repository.name)
        except Exception as error:
            report(f"[{index}/{total}] {repository.name}: ERROR: {error}")
            return RepositoryResult(
                name=repository.name, status="analysis_failed", error=str(error), sbom=sbom, grype=grype
            )

        targets = supported_languages(languages)
        if not targets:
            report(f"[{index}/{total}] {repository.name}: no soportado")
            return RepositoryResult(
                name=repository.name, status="unsupported", languages=languages, sbom=sbom, grype=grype
            )

        findings = []
        errors: list[tuple[str, str]] = []
        for target in targets:
            report(f"[{index}/{total}] {repository.name}: analizando con CodeQL ({target.name})")
            result = self.codeql.analyze(
                workspace / repository.name,
                target.codeql_name,
                codeql_workspace / repository.name,
            )
            if not result.success:
                errors.append((result.stage or "analysis_failed", result.error or "Error desconocido."))
                report(f"[{index}/{total}] {repository.name}: ERROR: {errors[-1][1]}")
                continue
            if result.sarif_path is None:
                errors.append(("analysis_failed", "CodeQL no genero un archivo SARIF."))
                report(f"[{index}/{total}] {repository.name}: ERROR: {errors[-1][1]}")
                continue
            try:
                findings.extend(parse_sarif(result.sarif_path, target.name))
            except (OSError, ValueError) as error:
                errors.append(("analysis_failed", f"No se pudo leer el SARIF: {error}"))
                report(f"[{index}/{total}] {repository.name}: ERROR: {errors[-1][1]}")

        if errors:
            status = "database_creation_failed" if any(stage == "database_creation_failed" for stage, _ in errors) else "analysis_failed"
            return RepositoryResult(
                name=repository.name,
                status=status,
                languages=languages,
                analyzed_languages=[target.name for target in targets],
                findings=sorted(findings, key=lambda finding: (finding.file or "", finding.start_line or 0, finding.rule_id)),
                error="; ".join(error for _, error in errors),
                sbom=sbom,
                grype=grype,
            )

        report(f"[{index}/{total}] {repository.name}: analizado")
        return RepositoryResult(
            name=repository.name,
            status="analyzed",
            languages=languages,
            analyzed_languages=[target.name for target in targets],
            findings=sorted(findings, key=lambda finding: (finding.file or "", finding.start_line or 0, finding.rule_id)),
            sbom=sbom,
            grype=grype,
        )

    def _analyze_dependencies(self, sbom: SbomResult) -> GrypeResult:
        if sbom.status == "failed" or not sbom.path:
            return GrypeResult(status="skipped", error="SBOM no disponible para analizar con Grype.")
        path = Path(sbom.path)
        if not path.is_file():
            return GrypeResult(status="skipped", error=f"No se encontro el SBOM: {path}")
        return self.grype.scan(path)
