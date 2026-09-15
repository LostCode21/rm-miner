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


class RepositoryResult(BaseModel):
    name: str
    status: RepositoryStatus
    languages: list[str] = Field(default_factory=list)
    analyzed_languages: list[str] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    error: str | None = None
    sbom: SbomResult | None = None


class Summary(BaseModel):
    organization: str
    total_repositories: int
    analyzed_repositories: int
    failed_repositories: int
    unsupported_repositories: int
    total_findings: int


class OrganizationResult(BaseModel):
    organization: str
    repositories: list[RepositoryResult]
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
        unsupported_repositories=statuses["unsupported"],
        total_findings=sum(len(repository.findings) for repository in repositories),
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
