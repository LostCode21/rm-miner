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

    class Scanner:
        def __init__(self, client):
            pass

        def scan(self, organization, progress):
            return expected

    monkeypatch.setattr("miner.cli.OrganizationScanner", Scanner)
    output = tmp_path / "results.json"

    result = CliRunner().invoke(app, ["scan", "--organization", "example-org", "--output", str(output)])

    assert result.exit_code == 0
    assert output.exists()
    assert '"organization": "example-org"' in output.read_text(encoding="utf-8")
