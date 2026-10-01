import json
import subprocess

from miner.grype.runner import GrypeRunner


def test_grype_runner_parses_vulnerabilities(monkeypatch, tmp_path):
    document = {
        "matches": [
            {
                "vulnerability": {
                    "id": "CVE-2021-1234",
                    "severity": "High",
                    "description": "remote code execution",
                    "fix": {"versions": ["2.1.0"], "state": "fixed"},
                },
                "artifact": {
                    "name": "requests",
                    "version": "2.0.0",
                    "type": "python",
                    "locations": [{"path": "/app/requirements.txt"}],
                },
            }
        ]
    }
    responses = iter(
        [
            subprocess.CompletedProcess([], 0, '{"version": "0.90.0"}', ""),
            subprocess.CompletedProcess([], 0, json.dumps(document), ""),
        ]
    )
    monkeypatch.setattr("miner.grype.runner.subprocess.run", lambda *args, **kwargs: next(responses))

    result = GrypeRunner().scan(tmp_path / "repo.cdx.json")

    assert result.status == "analyzed"
    assert result.version == "0.90.0"
    assert result.vulnerability_count == 1
    vulnerability = result.vulnerabilities[0]
    assert vulnerability.id == "CVE-2021-1234"
    assert vulnerability.severity == "High"
    assert vulnerability.package == "requests"
    assert vulnerability.version == "2.0.0"
    assert vulnerability.fixed_version == "2.1.0"
    assert vulnerability.location == "/app/requirements.txt"


def test_grype_runner_marks_an_empty_scan(monkeypatch, tmp_path):
    responses = iter(
        [
            subprocess.CompletedProcess([], 0, '{"version": "0.90.0"}', ""),
            subprocess.CompletedProcess([], 0, '{"matches": []}', ""),
        ]
    )
    monkeypatch.setattr("miner.grype.runner.subprocess.run", lambda *args, **kwargs: next(responses))

    result = GrypeRunner().scan(tmp_path / "repo.cdx.json")

    assert result.status == "analyzed"
    assert result.vulnerability_count == 0


def test_grype_runner_marks_a_grype_error_as_failed(monkeypatch, tmp_path):
    responses = iter(
        [
            subprocess.CompletedProcess([], 0, '{"version": "0.90.0"}', ""),
            subprocess.CompletedProcess([], 1, "", "database is corrupt"),
        ]
    )
    monkeypatch.setattr("miner.grype.runner.subprocess.run", lambda *args, **kwargs: next(responses))

    result = GrypeRunner().scan(tmp_path / "repo.cdx.json")

    assert result.status == "failed"
    assert result.error == "database is corrupt"


def test_grype_runner_reports_missing_executable(monkeypatch, tmp_path):
    def run(*args, **kwargs):
        raise FileNotFoundError("grype")

    monkeypatch.setattr("miner.grype.runner.subprocess.run", run)

    result = GrypeRunner().scan(tmp_path / "repo.cdx.json")

    assert result.status == "failed"
    assert "grype" in result.error
