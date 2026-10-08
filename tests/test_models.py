from miner.models import (
    Finding,
    GrypeResult,
    RepositoryResult,
    SbomResult,
    Vulnerability,
    build_findings,
    build_sbom_summary,
    build_summary,
)


def test_build_summary_counts_statuses_and_findings():
    repositories = [
        RepositoryResult(name="analyzed", status="analyzed", findings=[Finding(rule_id="r", message="m", language="Python")]),
        RepositoryResult(name="unsupported", status="unsupported"),
        RepositoryResult(name="clone", status="clone_failed"),
        RepositoryResult(name="analysis", status="analysis_failed"),
    ]

    summary = build_summary("example-org", repositories)

    assert summary.total_repositories == 4
    assert summary.analyzed_repositories == 1
    assert summary.failed_repositories == 2
    assert summary.sbom_failed_repositories == 0
    assert summary.unsupported_repositories == 1
    assert summary.total_findings == 1


def test_build_summary_counts_sbom_failures_separately():
    repositories = [
        RepositoryResult(
            name="sbom",
            status="analyzed",
            sbom=SbomResult(full_name="org/sbom", generated_at="2026-01-01T00:00:00Z", status="failed"),
        )
    ]

    summary = build_summary("org", repositories)

    assert summary.failed_repositories == 0
    assert summary.sbom_failed_repositories == 1


def test_build_summary_counts_grype_failures_and_vulnerabilities():
    repositories = [
        RepositoryResult(
            name="analyzed",
            status="analyzed",
            grype=GrypeResult(
                status="analyzed",
                vulnerability_count=2,
                vulnerabilities=[
                    Vulnerability(id="CVE-1", package="a"),
                    Vulnerability(id="CVE-2", package="b"),
                ],
            ),
        ),
        RepositoryResult(
            name="failed",
            status="analyzed",
            grype=GrypeResult(status="failed"),
        ),
    ]

    summary = build_summary("org", repositories)

    assert summary.grype_failed_repositories == 1
    assert summary.total_vulnerabilities == 2


def test_build_summary_total_findings_matches_the_flat_dataset():
    repositories = [
        RepositoryResult(
            name="repo",
            status="analyzed",
            findings=[Finding(rule_id="r", message="m", language="Python")],
            grype=GrypeResult(
                status="analyzed",
                vulnerability_count=2,
                vulnerabilities=[
                    Vulnerability(id="CVE-1", package="a"),
                    Vulnerability(id="CVE-2", package="b"),
                ],
            ),
        ),
        RepositoryResult(name="skipped", status="analyzed", grype=GrypeResult(status="skipped")),
    ]

    summary = build_summary("org", repositories)

    assert summary.total_findings == 3
    assert summary.total_findings == len(build_findings("org", repositories))
    assert summary.grype_skipped_repositories == 1


def test_build_findings_relates_each_result_to_its_repository():
    repositories = [
        RepositoryResult(
            name="repo",
            status="analyzed",
            findings=[
                Finding(
                    rule_id="js/xss",
                    severity="warning",
                    message="unsafe html",
                    file="src/app.js",
                    start_line=3,
                    language="JavaScript",
                )
            ],
            grype=GrypeResult(
                status="analyzed",
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
            ),
        )
    ]

    records = build_findings("example-org", repositories)

    assert [record.tool for record in records] == ["codeql", "grype"]
    assert {record.repository for record in records} == {"example-org/repo"}
    codeql = records[0]
    assert codeql.vulnerability_type == "js/xss"
    assert codeql.severity == "warning"
    assert codeql.location == "src/app.js"
    assert codeql.line == 3
    grype = records[1]
    assert grype.vulnerability_type == "CVE-2021-1234"
    assert grype.package == "requests"
    assert grype.location == "requirements.txt"


def test_build_sbom_summary_distinguishes_empty_and_failed_results():
    repositories = [
        SbomResult(full_name="org/generated", generated_at="2026-01-01T00:00:00Z", status="generated", component_count=2),
        SbomResult(full_name="org/empty", generated_at="2026-01-01T00:00:00Z", status="empty"),
        SbomResult(full_name="org/failed", generated_at="2026-01-01T00:00:00Z", status="failed"),
    ]

    summary = build_sbom_summary("org", repositories)

    assert summary.generated_repositories == 1
    assert summary.empty_repositories == 1
    assert summary.failed_repositories == 1
    assert summary.total_components == 2
