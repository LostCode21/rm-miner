# rm-miner

CLI para analizar con CodeQL los repositorios de una organizacion de GitHub, generar sus SBOMs con Syft y consolidar los resultados en JSON.

## Requisitos

- Linux, Python 3.10 o posterior, Git, CodeQL CLI y [Syft](https://github.com/anchore/syft) disponibles en `PATH`.
- Un token de GitHub en `GITHUB_TOKEN` para organizaciones privadas o para evitar limites bajos de la API. El token se usa solo para la API; Git debe tener configuradas sus propias credenciales HTTPS para clonar repositorios privados.

## Configuracion e instalacion

```bash
cp .env.example .env
python -m pip install -e '.[dev]'
```

Defina el token en `.env` si lo necesita:

```text
GITHUB_TOKEN=
```

No incluya tokens en Git, logs ni archivos de resultados.

## Uso

```bash
miner scan --organization example-org --output results.json
```

La herramienta obtiene y ordena todos los repositorios de la organizacion, genera un SBOM CycloneDX JSON para cada clon y analiza con CodeQL cada lenguaje compatible (Python, JavaScript/TypeScript y Ruby). Los SBOMs se guardan en `results-sboms/`, junto al archivo indicado mediante `--output`; los repositorios y bases CodeQL temporales se eliminan al finalizar.

El JSON incluye todos los repositorios, sus estados, lenguajes, hallazgos y los metadatos del SBOM: nombre completo, commit, fecha de generacion, version de Syft, estado, cantidad de componentes y ruta al archivo CycloneDX. Los SBOMs originales permanecen como archivos independientes. Los estados `generated`, `empty` y `failed` distinguen respectivamente una generacion con componentes, una generacion valida sin componentes y un error. Los fallos individuales no interrumpen el procesamiento, pero hacen que el comando termine con codigo 1.

### Generar SBOMs desde clones existentes

Para regenerar SBOMs sin volver a clonar ni ejecutar CodeQL, conserve los repositorios Git en un directorio de trabajo y ejecute:

```bash
miner sbom --organization example-org --workspace /ruta/a/repositorios --output sboms
```

El comando procesa los subdirectorios que sean repositorios Git, guarda un archivo `<repositorio>.cdx.json` por cada uno en `sboms/` y deja el consolidado en `sboms/sbom-results.json`. Puede limitar la cantidad de repositorios con `--limit N`.

## Pruebas

```bash
python -m pytest
```
