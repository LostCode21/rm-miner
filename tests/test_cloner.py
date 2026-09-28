from subprocess import CompletedProcess

from miner.github.client import Repository
from miner.repository.cloner import RepositoryCloner


def test_clone_returns_failure_without_raising(monkeypatch, tmp_path):
    monkeypatch.setattr(
        "miner.repository.cloner.subprocess.run",
        lambda *args, **kwargs: CompletedProcess(args, 1, "", "access denied"),
    )

    result = RepositoryCloner().clone(Repository("private", "https://example/private.git"), tmp_path)

    assert not result.success
    assert result.error == "access denied"


def test_clone_reuses_an_existing_git_repository(monkeypatch, tmp_path):
    destination = tmp_path / "private"
    destination.joinpath(".git").mkdir(parents=True)
    monkeypatch.setattr(
        "miner.repository.cloner.subprocess.run",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("git clone no debe ejecutarse")),
    )

    result = RepositoryCloner().clone(Repository("private", "https://example/private.git"), tmp_path)

    assert result.success
