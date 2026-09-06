from miner.models import Finding, RepositoryResult, build_summary


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
