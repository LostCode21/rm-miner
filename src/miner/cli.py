"""Interfaz de linea de comandos del clonado inicial."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from miner.config import ConfigurationError, get_organization, load_dotenv
from miner.github.client import GitHubClient
from miner.repository.cloner import RepositoryCloner


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="miner")
    commands = parser.add_subparsers(dest="command", required=True)
    clone = commands.add_parser("clone", help="Clona los repositorios de la organizacion configurada.")
    clone.add_argument("--limit", type=int, default=None, help="Maximo de repositorios a clonar.")
    clone.add_argument("--workspace", type=Path, default=Path("workspace"), help="Directorio de destino.")
    return parser


def run_clone(limit: int | None, workspace: Path) -> int:
    if limit is not None and limit < 1:
        raise ValueError("--limit debe ser mayor que cero.")

    load_dotenv()
    organization = get_organization()
    repositories = GitHubClient(os.getenv("GITHUB_TOKEN")).list_repositories(organization)
    if limit is not None:
        repositories = repositories[:limit]

    workspace.mkdir(parents=True, exist_ok=True)
    print(f"Organizacion: {organization}. Repositorios a clonar: {len(repositories)}")
    cloner = RepositoryCloner()
    failures = 0
    for index, repository in enumerate(repositories, start=1):
        print(f"[{index}/{len(repositories)}] Clonando {repository.name}...", end=" ", flush=True)
        result = cloner.clone(repository, workspace)
        if result.success:
            print("OK")
        else:
            failures += 1
            print(f"ERROR: {result.error}")

    print(f"Finalizado. Exitosos: {len(repositories) - failures}. Fallidos: {failures}.")
    return 1 if failures else 0


def main() -> None:
    args = build_parser().parse_args()
    try:
        raise SystemExit(run_clone(args.limit, args.workspace))
    except (ConfigurationError, ValueError) as error:
        raise SystemExit(f"Error: {error}")
