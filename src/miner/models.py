"""Modelos de salida reproducibles del analisis."""

from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


RepositoryStatus = Literal[
    "analyzed",
    "clone_failed",
    "unsupported",
    "database_creation_failed",
    "analysis_failed",
]
SbomStatus = Literal["generated", "empty", "failed"]


class Finding(BaseModel):
    rule_id: str
    severity: str | None = None
    message: str
    file: str | None = None
    start_line: int | None = None
    language: str


class SbomResult(BaseModel):
    full_name: str
    commit: str | None = None
    generated_at: datetime
    syft_version: str | None = None
    status: SbomStatus
    component_count: int = 0
    path: str | None = None
    error: str | None = None


GrypeStatus = Literal["analyzed", "skipped", "failed"]


class Vulnerability(BaseModel):
    """Vulnerabilidad conocida detectada por Grype en una dependencia."""

    id: str
    severity: str | None = None
    package: str
    version: str | None = None
    fixed_version: str | None = None
    artifact_type: str | None = None
    location: str | None = None
    message: str = ""


class GrypeResult(BaseModel):
    status: GrypeStatus
    version: str | None = None
    vulnerability_count: int = 0
    vulnerabilities: list[Vulnerability] = Field(default_factory=list)
    error: str | None = None


class RepositoryResult(BaseModel):
    name: str
    status: RepositoryStatus
    languages: list[str] = Field(default_factory=list)
    analyzed_languages: list[str] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    error: str | None = None
    sbom: SbomResult | None = None
    grype: GrypeResult | None = None


class FindingRecord(BaseModel):
    """Hallazgo normalizado que relaciona un resultado con su repositorio de origen."""

    repository: str
    tool: Literal["codeql", "grype"]
    vulnerability_type: str
    severity: str | None = None
    location: str | None = None
    line: int | None = None
    package: str | None = None
    version: str | None = None
    fixed_version: str | None = None
    artifact_type: str | None = None
    language: str | None = None
    message: str = ""


class Summary(BaseModel):
    organization: str
    total_repositories: int
    analyzed_repositories: int
    failed_repositories: int
    sbom_failed_repositories: int
    unsupported_repositories: int
    total_findings: int
    grype_failed_repositories: int = 0
    grype_skipped_repositories: int = 0
    total_vulnerabilities: int = 0


class OrganizationResult(BaseModel):
    organization: str
    repositories: list[RepositoryResult]
    findings: list[FindingRecord] = Field(default_factory=list)
    summary: Summary


class SbomSummary(BaseModel):
    organization: str
    total_repositories: int
    generated_repositories: int
    empty_repositories: int
    failed_repositories: int
    total_components: int


class OrganizationSbomResult(BaseModel):
    organization: str
    repositories: list[SbomResult]
    summary: SbomSummary


def build_summary(organization: str, repositories: list[RepositoryResult]) -> Summary:
    statuses = Counter(repository.status for repository in repositories)
    return Summary(
        organization=organization,
        total_repositories=len(repositories),
        analyzed_repositories=statuses["analyzed"],
        failed_repositories=sum(
            statuses[status]
            for status in ("clone_failed", "database_creation_failed", "analysis_failed")
        ),
        sbom_failed_repositories=sum(repository.sbom is not None and repository.sbom.status == "failed" for repository in repositories),
        unsupported_repositories=statuses["unsupported"],
        total_findings=sum(
            len(repository.findings)
            + (len(repository.grype.vulnerabilities) if repository.grype is not None else 0)
            for repository in repositories
        ),
        grype_failed_repositories=sum(repository.grype is not None and repository.grype.status == "failed" for repository in repositories),
        grype_skipped_repositories=sum(repository.grype is not None and repository.grype.status == "skipped" for repository in repositories),
        total_vulnerabilities=sum(
            len(repository.grype.vulnerabilities) for repository in repositories if repository.grype is not None
        ),
    )


def build_findings(organization: str, repositories: list[RepositoryResult]) -> list[FindingRecord]:
    """Aplana los hallazgos de CodeQL y Grype conservando el repositorio de origen."""
    records: list[FindingRecord] = []
    for repository in repositories:
        full_name = f"{organization}/{repository.name}"
        for finding in repository.findings:
            records.append(
                FindingRecord(
                    repository=full_name,
                    tool="codeql",
                    vulnerability_type=finding.rule_id,
                    severity=finding.severity,
                    location=finding.file,
                    line=finding.start_line,
                    language=finding.language,
                    message=finding.message,
                )
            )
        for vulnerability in repository.grype.vulnerabilities if repository.grype is not None else []:
            records.append(
                FindingRecord(
                    repository=full_name,
                    tool="grype",
                    vulnerability_type=vulnerability.id,
                    severity=vulnerability.severity,
                    location=vulnerability.location,
                    package=vulnerability.package,
                    version=vulnerability.version,
                    fixed_version=vulnerability.fixed_version,
                    artifact_type=vulnerability.artifact_type,
                    message=vulnerability.message,
                )
            )
    return sorted(
        records,
        key=lambda record: (
            record.repository,
            record.tool,
            record.vulnerability_type,
            record.location or "",
            record.line or 0,
            record.package or "",
        ),
    )


def build_sbom_summary(organization: str, repositories: list[SbomResult]) -> SbomSummary:
    statuses = Counter(repository.status for repository in repositories)
    return SbomSummary(
        organization=organization,
        total_repositories=len(repositories),
        generated_repositories=statuses["generated"],
        empty_repositories=statuses["empty"],
        failed_repositories=statuses["failed"],
        total_components=sum(repository.component_count for repository in repositories),
    )
