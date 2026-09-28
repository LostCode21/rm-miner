from subprocess import CompletedProcess

from miner.codeql.runner import CodeQLRunner


def test_runner_creates_database_then_generates_sarif(monkeypatch, tmp_path):
    calls = []

    def run(*args, **kwargs):
        calls.append(args[0])
        return CompletedProcess(args[0], 0, "", "")

    monkeypatch.setattr("miner.codeql.runner.subprocess.run", run)

    result = CodeQLRunner().analyze(tmp_path / "source", "python", tmp_path / "work")

    assert result.success
    assert result.sarif_path == tmp_path / "work" / "results-python.sarif"
    assert calls[0][:3] == ["codeql", "database", "create"]
    assert calls[1][:3] == ["codeql", "database", "analyze"]
    assert "python-security-and-quality.qls" in calls[1][4]


def test_runner_reports_database_creation_failure(monkeypatch, tmp_path):
    monkeypatch.setattr(
        "miner.codeql.runner.subprocess.run",
        lambda *args, **kwargs: CompletedProcess(args[0], 1, "", "missing codeql"),
    )

    result = CodeQLRunner().analyze(tmp_path / "source", "python", tmp_path / "work")

    assert not result.success
    assert result.stage == "database_creation_failed"
    assert result.error == "missing codeql"
