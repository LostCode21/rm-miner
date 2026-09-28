"""Orquestacion de SBOMs para repositorios locales ya clonados."""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from miner.models import OrganizationSbomResult, SbomResult, build_sbom_summary
from miner.sbom.generator import SyftRunner

Progress = Callable[[str], None]


class OrganizationSbomGenerator:
    def __init__(self, syft: SyftRunner | None = None) -> None:
        self.syft = syft or SyftRunner()

    def generate(
        self,
        organization: str,
        workspace: Path,
        output_dir: Path,
        progress: Progress | None = None,
        limit: int | None = None,
    ) -> OrganizationSbomResult:
        report = progress or (lambda _: None)
        repositories = sorted(
            (path for path in workspace.iterdir() if path.is_dir() and (path / ".git").exists()),
            key=lambda path: path.name.casefold(),
        )
        if limit is not None:
            repositories = repositories[:limit]

        results: list[SbomResult] = []
        for index, repository in enumerate(repositories, start=1):
            report(f"[{index}/{len(repositories)}] {repository.name}: generando SBOM")
            result = self.syft.generate(
                f"{organization}/{repository.name}",
                repository,
                output_dir / f"{repository.name}.cdx.json",
            )
            if result.status == "failed":
                report(f"[{index}/{len(repositories)}] {repository.name}: ERROR: {result.error}")
            else:
                report(f"[{index}/{len(repositories)}] {repository.name}: SBOM {result.status}")
            results.append(result)

        return OrganizationSbomResult(
            organization=organization,
            repositories=results,
            summary=build_sbom_summary(organization, results),
        )
