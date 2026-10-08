import pytest
from typer.testing import CliRunner

from miner.cli import app
from miner.models import OrganizationResult, OrganizationSbomResult, SbomSummary, Summary


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
            sbom_failed_repositories=0,
            unsupported_repositories=0,
            total_findings=0,
        ),
    )
    workspaces = []
    codeql_workspaces = []

    class Scanner:
        def __init__(self, client):
            pass

        def scan(self, organization, workspace, progress, limit, sbom_output_dir, codeql_workspace):
            assert limit == 1
            assert workspace == tmp_path / ".miner-work"
            workspace.joinpath("repo").mkdir()
            codeql_workspace.joinpath("database").mkdir()
            workspaces.append(workspace)
            codeql_workspaces.append(codeql_workspace)
            return expected

    monkeypatch.setattr("miner.cli.OrganizationScanner", Scanner)
    monkeypatch.chdir(tmp_path)
    output = tmp_path / "results.json"

    result = CliRunner().invoke(
        app,
        ["scan", "--organization", "example-org", "--output", str(output), "--limit", "1"],
    )

    assert result.exit_code == 0
    assert output.exists()
    assert '"organization": "example-org"' in output.read_text(encoding="utf-8")
    assert workspaces[0].joinpath("repo").is_dir()
    assert not codeql_workspaces[0].exists()
    assert "Generando archivo JSON..." in result.output


def test_scan_accepts_limit_of_twenty(monkeypatch, tmp_path):
    expected = OrganizationResult(
        organization="example-org",
        repositories=[],
        summary=Summary(
            organization="example-org",
            total_repositories=0,
            analyzed_repositories=0,
            failed_repositories=0,
            sbom_failed_repositories=0,
            unsupported_repositories=0,
            total_findings=0,
        ),
    )

    class Scanner:
        def __init__(self, client):
            pass

        def scan(self, organization, workspace, progress, limit, sbom_output_dir, codeql_workspace):
            assert limit == 20
            return expected

    monkeypatch.setattr("miner.cli.OrganizationScanner", Scanner)
    monkeypatch.chdir(tmp_path)

    result = CliRunner().invoke(
        app,
        ["scan", "--organization", "example-org", "--output", str(tmp_path / "results.json"), "--limit", "20"],
    )

    assert result.exit_code == 0


@pytest.mark.parametrize(
    "failed_field",
    ["failed_repositories", "sbom_failed_repositories", "grype_failed_repositories"],
)
def test_scan_exits_with_code_1_on_summary_failures(monkeypatch, tmp_path, failed_field):
    failures = {
        "failed_repositories": 0,
        "sbom_failed_repositories": 0,
        "grype_failed_repositories": 0,
    }
    failures[failed_field] = 1
    expected = OrganizationResult(
        organization="example-org",
        repositories=[],
        summary=Summary(
            organization="example-org",
            total_repositories=1,
            analyzed_repositories=0,
            unsupported_repositories=0,
            total_findings=0,
            **failures,
        ),
    )

    class Scanner:
        def __init__(self, client):
            pass

        def scan(self, organization, workspace, progress, limit, sbom_output_dir, codeql_workspace):
            return expected

    monkeypatch.setattr("miner.cli.OrganizationScanner", Scanner)
    monkeypatch.chdir(tmp_path)

    result = CliRunner().invoke(
        app,
        ["scan", "--organization", "example-org", "--output", str(tmp_path / "results.json")],
    )

    assert result.exit_code == 1


def test_sbom_writes_consolidated_json(monkeypatch, tmp_path):
    expected = OrganizationSbomResult(
        organization="example-org",
        repositories=[],
        summary=SbomSummary(
            organization="example-org",
            total_repositories=0,
            generated_repositories=0,
            empty_repositories=0,
            failed_repositories=0,
            total_components=0,
        ),
    )

    class Generator:
        def generate(self, organization, workspace, output, progress, limit):
            assert organization == "example-org"
            assert limit == 1
            return expected

    workspace = tmp_path / "workspace"
    workspace.mkdir()
    output = tmp_path / "sboms"
    monkeypatch.setattr("miner.cli.OrganizationSbomGenerator", Generator)

    result = CliRunner().invoke(
        app,
        ["sbom", "--organization", "example-org", "--workspace", str(workspace), "--output", str(output), "--limit", "1"],
    )

    assert result.exit_code == 0
    assert (output / "sbom-results.json").exists()


def test_scan_rejects_non_positive_limit(tmp_path):
    result = CliRunner().invoke(
        app,
        ["scan", "--organization", "example-org", "--output", str(tmp_path / "results.json"), "--limit", "0"],
    )

    assert result.exit_code != 0
    assert "Invalid value" in result.output


def test_scan_rejects_limit_above_fifty(tmp_path):
    result = CliRunner().invoke(
        app,
        ["scan", "--organization", "example-org", "--output", str(tmp_path / "results.json"), "--limit", "51"],
    )

    assert result.exit_code != 0
    assert "Invalid value" in result.output
