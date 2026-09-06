"""Interfaz de linea de comandos del miner."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

import typer

from miner.config import load_dotenv
from miner.github.client import GitHubClient
from miner.scanner import OrganizationScanner

app = typer.Typer(help="Analiza repositorios de una organizacion con CodeQL.")


@app.callback()
def cli() -> None:
    """Analiza repositorios de una organizacion con CodeQL."""


@app.command()
def scan(
    organization: Annotated[str, typer.Option("--organization", help="Organizacion de GitHub a analizar.")],
    output: Annotated[Path, typer.Option("--output", help="Archivo JSON de salida.")],
) -> None:
    """Analiza todos los repositorios accesibles de una organizacion."""
    load_dotenv()
    result = OrganizationScanner(GitHubClient(os.getenv("GITHUB_TOKEN"))).scan(organization, typer.echo)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(result.model_dump_json(indent=2) + "\n", encoding="utf-8")
    typer.echo(f"Finalizado. Resultados guardados en {output}.")
    if result.summary.failed_repositories:
        raise typer.Exit(1)


def main() -> None:
    app()
