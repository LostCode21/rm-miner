"""Modelos de salida reproducibles del analisis."""

from __future__ import annotations

from collections import Counter
from typing import Literal

from pydantic import BaseModel, Field


RepositoryStatus = Literal[
    "analyzed",
    "clone_failed",
    "unsupported",
    "database_creation_failed",
    "analysis_failed",
]


class Finding(BaseModel):
    rule_id: str
    severity: str | None = None
    message: str
    file: str | None = None
    start_line: int | None = None
    language: str


class RepositoryResult(BaseModel):
    name: str
    status: RepositoryStatus
    languages: list[str] = Field(default_factory=list)
    analyzed_languages: list[str] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    error: str | None = None


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
