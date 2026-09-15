import json
import subprocess

from miner.sbom.generator import SyftRunner


def test_syft_runner_writes_cyclonedx_and_counts_components(monkeypatch, tmp_path):
    responses = iter(
        [
            subprocess.CompletedProcess([], 0, "abc123\n", ""),
            subprocess.CompletedProcess([], 0, '{"version": "1.2.3"}', ""),
            subprocess.CompletedProcess([], 0, json.dumps({"components": [{"name": "one"}]}), ""),
        ]
    )
    monkeypatch.setattr("miner.sbom.generator.subprocess.run", lambda *args, **kwargs: next(responses))
    output = tmp_path / "sboms" / "repo.cdx.json"

    result = SyftRunner().generate("example-org/repo", tmp_path, output)

    assert result.status == "generated"
    assert result.commit == "abc123"
    assert result.syft_version == "1.2.3"
    assert result.component_count == 1
    assert json.loads(output.read_text(encoding="utf-8"))["components"][0]["name"] == "one"


def test_syft_runner_marks_an_empty_sbom(monkeypatch, tmp_path):
    responses = iter(
        [
            subprocess.CompletedProcess([], 0, "abc123\n", ""),
            subprocess.CompletedProcess([], 0, '{"version": "1.2.3"}', ""),
            subprocess.CompletedProcess([], 0, '{"components": []}', ""),
        ]
    )
    monkeypatch.setattr("miner.sbom.generator.subprocess.run", lambda *args, **kwargs: next(responses))

    result = SyftRunner().generate("example-org/repo", tmp_path, tmp_path / "repo.cdx.json")

    assert result.status == "empty"
    assert result.component_count == 0


def test_syft_runner_marks_a_syft_error_as_failed(monkeypatch, tmp_path):
    responses = iter(
        [
            subprocess.CompletedProcess([], 0, "abc123\n", ""),
            subprocess.CompletedProcess([], 0, '{"version": "1.2.3"}', ""),
            subprocess.CompletedProcess([], 1, "", "cannot scan"),
        ]
    )
    monkeypatch.setattr("miner.sbom.generator.subprocess.run", lambda *args, **kwargs: next(responses))

    result = SyftRunner().generate("example-org/repo", tmp_path, tmp_path / "repo.cdx.json")

    assert result.status == "failed"
    assert result.error == "cannot scan"
