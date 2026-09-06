import json
from pathlib import Path

from miner.codeql.runner import CodeQLResult
from miner.github.client import Repository
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


def test_scanner_returns_consolidated_analyzed_result(tmp_path):
    sarif = tmp_path / "result.sarif"
    sarif.write_text(
        json.dumps({"runs": [{"tool": {"driver": {"rules": []}}, "results": [{"ruleId": "rule", "message": {"text": "message"}}]}]}),
        encoding="utf-8",
    )

    result = OrganizationScanner(Client(), Cloner(), Runner(sarif)).scan("example-org", tmp_path / "temp_repos")

    assert result.summary.total_repositories == 1
    assert result.summary.total_findings == 1
    assert result.repositories[0].status == "analyzed"
    assert result.repositories[0].languages == ["Go", "Python"]
    assert result.repositories[0].analyzed_languages == ["Python"]


def test_scanner_limits_processed_repositories(tmp_path):
    sarif = tmp_path / "result.sarif"
    sarif.write_text(json.dumps({"runs": []}), encoding="utf-8")

    class MultipleRepositoriesClient(Client):
        def list_repositories(self, organization):
            return [
                Repository("repo-1", "https://example/repo-1.git"),
                Repository("repo-2", "https://example/repo-2.git"),
            ]

    result = OrganizationScanner(MultipleRepositoriesClient(), Cloner(), Runner(sarif)).scan(
        "example-org", tmp_path / "temp_repos", limit=1
    )

    assert result.summary.total_repositories == 1
    assert [repository.name for repository in result.repositories] == ["repo-1"]
