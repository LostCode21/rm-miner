"""Cliente minimo para recuperar repositorios de una organizacion."""

from __future__ import annotations

from dataclasses import dataclass

import requests


@dataclass(frozen=True)
class Repository:
    name: str
    clone_url: str


class GitHubClient:
    def __init__(self, token: str | None = None) -> None:
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/vnd.github+json"})
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"

    def list_repositories(self, organization: str) -> list[Repository]:
        url = f"https://api.github.com/orgs/{organization}/repos"
        repositories: list[Repository] = []
        params: dict[str, str | int] | None = {"per_page": 100, "type": "all"}

        while url:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            repositories.extend(
                Repository(name=item["name"], clone_url=item["clone_url"])
                for item in response.json()
            )
            url = response.links.get("next", {}).get("url")
            params = None

        return sorted(repositories, key=lambda repository: repository.name.casefold())
