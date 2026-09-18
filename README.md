# rm-miner

CLI para analizar con CodeQL los repositorios de una organizacion de GitHub, generar sus SBOMs con Syft y consolidar los resultados en JSON.

## Requisitos

- Linux, Python 3.10 o posterior, Git, CodeQL CLI y [Syft](https://github.com/anchore/syft) disponibles en `PATH`.
- Un token de GitHub en `GITHUB_TOKEN` para organizaciones privadas o para evitar limites bajos de la API. El token se usa solo para la API; Git debe tener configuradas sus propias credenciales HTTPS para clonar repositorios privados.

### Instalar Syft

En Linux, el instalador oficial de Anchore instala Syft en `/usr/local/bin`:

```bash
curl -sSfL https://get.anchore.io/syft | sudo sh -s -- -b /usr/local/bin
syft version
```

Consulte las [alternativas oficiales de instalacion](https://oss.anchore.com/docs/installation/) para Homebrew, Docker, Scoop, Chocolatey y Nix. El comando debe poder ejecutarse simplemente como `syft`; de lo contrario, `miner` registra ese repositorio con estado `failed` y continúa con los demas.

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

### Archivos de salida de SBOM

- `<repositorio>.cdx.json` es el SBOM CycloneDX JSON original generado por Syft. Su arreglo `components` contiene los paquetes y otros artefactos que Syft pudo identificar.
- `sbom-results.json` consolida una entrada por repositorio: `full_name`, `commit`, `generated_at`, `syft_version`, `status`, `component_count`, `path` y, si corresponde, `error`. Su bloque `summary` totaliza los repositorios y componentes.

El estado `generated` indica que Syft produjo al menos un componente, `empty` que el documento es valido pero no contiene componentes, y `failed` que no fue posible generarlo. El conteo corresponde exactamente a `components` del archivo CycloneDX, por lo que no debe interpretarse como un conteo exclusivo de dependencias de aplicacion.

### Ejemplo completo

```bash
mkdir -p /tmp/repositories
git clone https://github.com/example-org/api.git /tmp/repositories/api
git clone https://github.com/example-org/web.git /tmp/repositories/web

miner sbom \
  --organization example-org \
  --workspace /tmp/repositories \
  --output ./resultados-sbom

# Inspeccionar el consolidado y un SBOM individual
python -m json.tool resultados-sbom/sbom-results.json
python -m json.tool resultados-sbom/api.cdx.json
```

El resultado queda en `resultados-sbom/sbom-results.json`, y los SBOMs individuales en `resultados-sbom/api.cdx.json` y `resultados-sbom/web.cdx.json`.

### Comprobacion con manifiestos y lockfiles

Se ejecuto `miner sbom` sobre un clon limpio de este proyecto con Syft 1.52.0. El repositorio contiene `pyproject.toml` y `uv.lock`. El SBOM se genero correctamente con 29 entradas en `components`:

- Las dependencias directas declaradas en `pyproject.toml` (`pydantic`, `requests`, `typer`) y la dependencia de desarrollo `pytest` aparecieron con las versiones resueltas en `uv.lock`: 2.13.5, 2.34.2, 0.27.2 y 9.1.1, respectivamente.
- Las 25 entradas de paquetes del lockfile, incluido `rm-miner`, quedaron identificadas. El conteo final fue mayor porque Syft tambien incluyo `PKG-INFO`, `top_level.txt` y el propio `uv.lock` como artefactos, y registro `rm-miner` dos veces desde metadatos distintos.

Por tanto, el inventario no es una copia literal del manifiesto ni del lockfile: depende de los archivos presentes en el clon y de los catálogos que Syft pueda reconocer. Directorios generados dentro del repositorio (por ejemplo, `.venv` o `node_modules`) pueden añadir paquetes y metadatos al resultado; para inventarios reproducibles conviene analizar clones limpios.

## Pruebas

```bash
python -m pytest
```
