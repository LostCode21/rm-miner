from miner.models import Finding, RepositoryResult, SbomResult, build_sbom_summary, build_summary


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
    assert summary.unsupported_repositories == 1
    assert summary.total_findings == 1


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
