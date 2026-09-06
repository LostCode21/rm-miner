from typer.testing import CliRunner

from miner.cli import app
from miner.models import OrganizationResult, Summary


def test_help_exposes_scan_command():
    result = CliRunner().invoke(app, ["--help"])

    assert result.exit_code == 0
    assert "scan" in result.output


def test_scan_writes_consolidated_json(monkeypatch, tmp_path):
    expected = OrganizationResult(
        organization="example-org",
        repositories=[],
        summary=Summary(
            organization="example-org",
            total_repositories=0,
            analyzed_repositories=0,
            failed_repositories=0,
            unsupported_repositories=0,
            total_findings=0,
        ),
    )
    temporary_directories = []

    class Scanner:
        def __init__(self, client):
            pass

        def scan(self, organization, workspace, progress, limit):
            assert limit == 1
            assert workspace.name.startswith("temp_repos-")
            workspace.joinpath("repo").mkdir()
            temporary_directories.append(workspace)
            return expected

    monkeypatch.setattr("miner.cli.OrganizationScanner", Scanner)
    output = tmp_path / "results.json"

    result = CliRunner().invoke(
        app,
        ["scan", "--organization", "example-org", "--output", str(output), "--limit", "1"],
    )

    assert result.exit_code == 0
    assert output.exists()
    assert '"organization": "example-org"' in output.read_text(encoding="utf-8")
    assert not temporary_directories[0].exists()
    assert "Generando archivo JSON..." in result.output
    assert "Limpiando repositorios temporales..." in result.output


def test_scan_rejects_non_positive_limit(tmp_path):
    result = CliRunner().invoke(
        app,
        ["scan", "--organization", "example-org", "--output", str(tmp_path / "results.json"), "--limit", "0"],
    )

    assert result.exit_code != 0
    assert "Invalid value" in result.output
