from miner.models import SbomResult
from miner.sbom.scanner import OrganizationSbomGenerator


def test_sbom_generator_continues_after_a_repository_failure(tmp_path):
    for name in ("broken", "valid"):
        (tmp_path / name / ".git").mkdir(parents=True)

    class Syft:
        def generate(self, full_name, source, output):
            return SbomResult(
                full_name=full_name,
                generated_at="2026-01-01T00:00:00Z",
                status="failed" if source.name == "broken" else "empty",
                error="error" if source.name == "broken" else None,
                path=str(output) if source.name == "valid" else None,
            )

    result = OrganizationSbomGenerator(Syft()).generate("example-org", tmp_path, tmp_path / "output")

    assert [repository.full_name for repository in result.repositories] == ["example-org/broken", "example-org/valid"]
    assert result.summary.failed_repositories == 1
    assert result.summary.empty_repositories == 1
