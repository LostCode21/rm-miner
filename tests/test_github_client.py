from miner.github.client import GitHubClient


class Response:
    def __init__(self, payload, next_url=None):
        self.payload = payload
        self.links = {"next": {"url": next_url}} if next_url else {}

    def raise_for_status(self):
        pass

    def json(self):
        return self.payload


def test_list_repositories_paginates_and_sorts(monkeypatch):
    responses = iter(
        [
            Response(
                [
                    {"name": "zeta", "clone_url": "https://example/zeta.git"},
                    {"name": "archived", "clone_url": "https://example/archived.git", "archived": True},
                ],
                "https://api.github.com/page/2",
            ),
            Response([{"name": "Alpha", "clone_url": "https://example/alpha.git"}]),
        ]
    )
    client = GitHubClient()
    monkeypatch.setattr(client.session, "get", lambda *args, **kwargs: next(responses))

    repositories = client.list_repositories("example-org")

    assert [repository.name for repository in repositories] == ["Alpha", "archived", "zeta"]


def test_list_languages_returns_stable_order(monkeypatch):
    client = GitHubClient()
    monkeypatch.setattr(client.session, "get", lambda *args, **kwargs: Response({"Ruby": 3, "Python": 4}))

    languages = client.list_languages("example-org", "example-repo")

    assert languages == ["Python", "Ruby"]
