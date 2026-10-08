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


def test_grype_runner_keeps_results_when_fail_on_threshold_is_set(monkeypatch, tmp_path):
    document = {
        "matches": [
            {
                "vulnerability": {"id": "CVE-2021-1234", "severity": "Critical"},
                "artifact": {"name": "openssl", "version": "1.0.0", "type": "deb"},
            }
        ]
    }
    responses = iter(
        [
            subprocess.CompletedProcess([], 0, '{"version": "0.90.0"}', ""),
            subprocess.CompletedProcess([], 1, json.dumps(document), "threshold exceeded"),
        ]
    )
    monkeypatch.setattr("miner.grype.runner.subprocess.run", lambda *args, **kwargs: next(responses))

    result = GrypeRunner().scan(tmp_path / "repo.cdx.json")

    assert result.status == "analyzed"
    assert result.vulnerability_count == 1
    assert result.vulnerabilities[0].id == "CVE-2021-1234"


def test_grype_runner_sorts_vulnerabilities_deterministically(monkeypatch, tmp_path):
    document = {
        "matches": [
            {
                "vulnerability": {"id": "CVE-2"},
                "artifact": {"name": "b", "version": "1.0", "locations": [{"path": "b.txt"}]},
            },
            {
                "vulnerability": {"id": "CVE-1"},
                "artifact": {"name": "a", "version": "1.0", "locations": [{"path": "a.txt"}]},
            },
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

    assert [vulnerability.id for vulnerability in result.vulnerabilities] == ["CVE-1", "CVE-2"]


def test_grype_runner_marks_invalid_json_as_failed(monkeypatch, tmp_path):
    responses = iter(
        [
            subprocess.CompletedProcess([], 0, '{"version": "0.90.0"}', ""),
            subprocess.CompletedProcess([], 0, "not json", ""),
        ]
    )
    monkeypatch.setattr("miner.grype.runner.subprocess.run", lambda *args, **kwargs: next(responses))

    result = GrypeRunner().scan(tmp_path / "repo.cdx.json")

    assert result.status == "failed"
    assert "JSON" in result.error


def test_grype_runner_reports_timeout(monkeypatch, tmp_path):
    def run(*args, **kwargs):
        raise subprocess.TimeoutExpired(args[0], 600)

    monkeypatch.setattr("miner.grype.runner.subprocess.run", run)

    result = GrypeRunner().scan(tmp_path / "repo.cdx.json")

    assert result.status == "failed"
    assert "limite" in result.error


def test_grype_runner_reports_missing_executable(monkeypatch, tmp_path):
    def run(*args, **kwargs):
        raise FileNotFoundError("grype")

    monkeypatch.setattr("miner.grype.runner.subprocess.run", run)

    result = GrypeRunner().scan(tmp_path / "repo.cdx.json")

    assert result.status == "failed"
    assert "grype" in result.error
