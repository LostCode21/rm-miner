import json
from pathlib import Path

from miner.codeql.runner import CodeQLResult
from miner.github.client import Repository
from miner.models import GrypeResult, SbomResult, Vulnerability
from miner.repository.cloner import CloneResult
from miner.scanner import OrganizationScanner


class Client:
    def list_repositories(self, organization):
        return [Repository("repo", "https://example/repo.git")]

    def list_languages(self, organization, repository):
        return ["Go", "Python"]


class Cloner:
    def clone(self, repository, workspace):
        return CloneResult(repository.name, True)


class Runner:
    def __init__(self, sarif_path: Path):
        self.sarif_path = sarif_path

    def analyze(self, source, language, workdir):
        return CodeQLResult(True, sarif_path=self.sarif_path)


class Syft:
    def generate(self, full_name, source, output):
        return SbomResult(
            full_name=full_name,
            commit="commit",
            generated_at="2026-01-01T00:00:00Z",
            syft_version="1.0.0",
            status="generated",
            component_count=1,
            path=str(output),
        )


def test_scanner_returns_consolidated_analyzed_result(tmp_path):
    sarif = tmp_path / "result.sarif"
    sarif.write_text(
        json.dumps({"runs": [{"tool": {"driver": {"rules": []}}, "results": [{"ruleId": "rule", "message": {"text": "message"}}]}]}),
        encoding="utf-8",
    )

    result = OrganizationScanner(Client(), Cloner(), Runner(sarif), Syft()).scan("example-org", tmp_path / "temp_repos")

    assert result.summary.total_repositories == 1
    assert result.summary.total_findings == 1
    assert result.repositories[0].status == "analyzed"
    assert result.repositories[0].languages == ["Go", "Python"]
    assert result.repositories[0].analyzed_languages == ["Python"]
    assert result.repositories[0].sbom is not None
    assert result.repositories[0].sbom.status == "generated"


class Grype:
    def scan(self, sbom_path):
        return GrypeResult(
            status="analyzed",
            version="0.90.0",
            vulnerability_count=1,
            vulnerabilities=[
                Vulnerability(
                    id="CVE-2021-1234",
                    severity="High",
                    package="requests",
                    version="2.0.0",
                    location="requirements.txt",
                )
            ],
        )


class WritingSyft:
    def generate(self, full_name, source, output):
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text("{}", encoding="utf-8")
        return SbomResult(
            full_name=full_name,
            generated_at="2026-01-01T00:00:00Z",
            status="generated",
            component_count=1,
            path=str(output),
        )


def test_scanner_collects_vulnerabilities_and_flat_findings(tmp_path):
    sarif = tmp_path / "result.sarif"
    sarif.write_text(
        json.dumps({"runs": [{"tool": {"driver": {"rules": []}}, "results": [{"ruleId": "rule", "message": {"text": "message"}}]}]}),
        encoding="utf-8",
    )

    result = OrganizationScanner(Client(), Cloner(), Runner(sarif), WritingSyft(), Grype()).scan(
        "example-org", tmp_path / "temp_repos"
    )

    assert result.repositories[0].grype is not None
    assert result.repositories[0].grype.vulnerability_count == 1
    assert result.summary.total_vulnerabilities == 1
    assert result.summary.grype_failed_repositories == 0
    assert {(record.tool, record.vulnerability_type, record.repository) for record in result.findings} == {
        ("codeql", "rule", "example-org/repo"),
        ("grype", "CVE-2021-1234", "example-org/repo"),
    }


def test_scanner_skips_grype_when_sbom_is_unavailable(tmp_path):
    sarif = tmp_path / "result.sarif"
    sarif.write_text(json.dumps({"runs": []}), encoding="utf-8")

    result = OrganizationScanner(Client(), Cloner(), Runner(sarif), Syft()).scan("example-org", tmp_path / "temp_repos")

    assert result.repositories[0].grype is not None
    assert result.repositories[0].grype.status == "skipped"
    assert result.summary.total_vulnerabilities == 0
    assert result.summary.grype_failed_repositories == 0
    assert result.summary.grype_skipped_repositories == 1


class FailingGrype:
    def scan(self, sbom_path):
        return GrypeResult(status="failed", error="grype boom")


def test_scanner_reports_grype_failures_in_summary(tmp_path):
    sarif = tmp_path / "result.sarif"
    sarif.write_text(json.dumps({"runs": []}), encoding="utf-8")

    result = OrganizationScanner(Client(), Cloner(), Runner(sarif), WritingSyft(), FailingGrype()).scan(
        "example-org", tmp_path / "temp_repos"
    )

    assert result.repositories[0].grype is not None
    assert result.repositories[0].grype.status == "failed"
    assert result.summary.grype_failed_repositories == 1
    assert result.summary.total_vulnerabilities == 0


def test_scanner_limits_processed_repositories(tmp_path):
    sarif = tmp_path / "result.sarif"
    sarif.write_text(json.dumps({"runs": []}), encoding="utf-8")

    class MultipleRepositoriesClient(Client):
        def list_repositories(self, organization):
            return [
                Repository("repo-1", "https://example/repo-1.git"),
                Repository("repo-2", "https://example/repo-2.git"),
            ]

    result = OrganizationScanner(MultipleRepositoriesClient(), Cloner(), Runner(sarif), Syft()).scan(
        "example-org", tmp_path / "temp_repos", limit=1
    )

    assert result.summary.total_repositories == 1
    assert [repository.name for repository in result.repositories] == ["repo-1"]


def test_scanner_continues_after_invalid_sarif(tmp_path):
    invalid_sarif = tmp_path / "invalid.sarif"
    invalid_sarif.write_text("not json", encoding="utf-8")
    valid_sarif = tmp_path / "valid.sarif"
    valid_sarif.write_text(json.dumps({"runs": []}), encoding="utf-8")

    class MultipleRepositoriesClient(Client):
        def list_repositories(self, organization):
            return [
                Repository("invalid", "https://example/invalid.git"),
                Repository("valid", "https://example/valid.git"),
            ]

    class MultipleRunner:
        def analyze(self, source, language, workdir):
            return CodeQLResult(True, sarif_path=invalid_sarif if source.name == "invalid" else valid_sarif)

    result = OrganizationScanner(MultipleRepositoriesClient(), Cloner(), MultipleRunner(), Syft()).scan("example-org", tmp_path)

    assert [repository.status for repository in result.repositories] == ["analysis_failed", "analyzed"]
    assert result.summary.failed_repositories == 1
