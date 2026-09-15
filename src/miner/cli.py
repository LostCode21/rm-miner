"""Interfaz de linea de comandos del miner."""

from __future__ import annotations

import os
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated

import typer

from miner.config import load_dotenv
from miner.github.client import GitHubClient
from miner.scanner import OrganizationScanner
from miner.sbom.scanner import OrganizationSbomGenerator

app = typer.Typer(help="Analiza repositorios de una organizacion con CodeQL.")


@app.callback()
def cli() -> None:
    """Analiza repositorios de una organizacion con CodeQL."""


@app.command()
def scan(
    organization: Annotated[str, typer.Option("--organization", help="Organizacion de GitHub a analizar.")],
    output: Annotated[Path, typer.Option("--output", help="Archivo JSON de salida.")],
    limit: Annotated[
        int | None,
        typer.Option("--limit", min=1, help="Cantidad maxima de repositorios a procesar."),
    ] = None,
) -> None:
    """Analiza todos los repositorios accesibles de una organizacion."""
    load_dotenv()
    sbom_output_dir = output.parent / f"{output.stem}-sboms"
    with TemporaryDirectory(prefix="temp_repos-") as temporary_directory:
        result = OrganizationScanner(GitHubClient(os.getenv("GITHUB_TOKEN"))).scan(
            organization,
            Path(temporary_directory),
            typer.echo,
            limit=limit,
            sbom_output_dir=sbom_output_dir,
        )
        typer.echo("Generando archivo JSON...")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(result.model_dump_json(indent=2) + "\n", encoding="utf-8")
        typer.echo("Limpiando repositorios temporales...")
    typer.echo(f"Finalizado. Resultados guardados en {output}.")
    if result.summary.failed_repositories or any(
        repository.sbom is not None and repository.sbom.status == "failed" for repository in result.repositories
    ):
        raise typer.Exit(1)


@app.command()
def sbom(
    organization: Annotated[str, typer.Option("--organization", help="Organizacion propietaria de los repositorios.")],
    workspace: Annotated[Path, typer.Option("--workspace", help="Directorio con repositorios Git ya clonados.")],
    output: Annotated[Path, typer.Option("--output", help="Directorio para SBOMs y el JSON consolidado.")],
    limit: Annotated[
        int | None,
        typer.Option("--limit", min=1, help="Cantidad maxima de repositorios a procesar."),
    ] = None,
) -> None:
    """Genera SBOMs sin ejecutar nuevamente el analisis de CodeQL."""
    if not workspace.is_dir():
        raise typer.BadParameter("El workspace debe ser un directorio existente.", param_hint="--workspace")
    output.mkdir(parents=True, exist_ok=True)
    result = OrganizationSbomGenerator().generate(organization, workspace, output, typer.echo, limit)
    consolidated = output / "sbom-results.json"
    consolidated.write_text(result.model_dump_json(indent=2) + "\n", encoding="utf-8")
    typer.echo(f"Finalizado. Resultados guardados en {consolidated}.")
    if result.summary.failed_repositories:
        raise typer.Exit(1)


def main() -> None:
    app()
