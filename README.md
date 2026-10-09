# rm-miner

CLI para analizar con CodeQL los repositorios de una organizacion de GitHub, generar sus SBOMs con Syft, detectar vulnerabilidades en las dependencias con Grype y consolidar los resultados en JSON.

## Requisitos

- Linux, Python 3.10 o posterior, Git, CodeQL CLI, [Syft](https://github.com/anchore/syft) y [Grype](https://github.com/anchore/grype) disponibles en `PATH`.
- Un token de GitHub en `GITHUB_TOKEN` para organizaciones privadas o para evitar limites bajos de la API. El token se usa solo para la API; Git debe tener configuradas sus propias credenciales HTTPS para clonar repositorios privados.

### Instalar Syft

En Linux, el instalador oficial de Anchore instala Syft en `/usr/local/bin`:

```bash
curl -sSfL https://get.anchore.io/syft | sudo sh -s -- -b /usr/local/bin
syft version
```

Consulte las [alternativas oficiales de instalacion](https://oss.anchore.com/docs/installation/) para Homebrew, Docker, Scoop, Chocolatey y Nix. El comando debe poder ejecutarse simplemente como `syft`; de lo contrario, `miner` registra ese repositorio con estado `failed` y continúa con los demas.

### Instalar Grype

Grype comparte el instalador de Anchore y tambien se instala en `/usr/local/bin`:

```bash
curl -sSfL https://get.anchore.io/grype | sudo sh -s -- -b /usr/local/bin
grype version
```

Grype analiza el SBOM CycloneDX generado por Syft, por lo que no vuelve a inspeccionar el codigo fuente. Si el comando `grype` no esta disponible, el SBOM se conserva y el repositorio queda registrado con un error de Grype sin interrumpir el resto del procesamiento.

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

La herramienta procesa sistematicamente cada repositorio de la organizacion: lo clona, genera un SBOM CycloneDX JSON con Syft, analiza el SBOM con Grype y ejecuta CodeQL sobre cada lenguaje compatible (Python, JavaScript/TypeScript y Ruby). Los clones se guardan en `.miner-work/` relativo al directorio desde el que se ejecuta el comando y se reutilizan en ejecuciones posteriores. Para usar otra ubicacion, indique `--workspace /ruta/a/repositorios`. Los SBOMs se guardan en `results-sboms/`, junto al archivo indicado mediante `--output`; las bases CodeQL temporales se eliminan al finalizar.

`--limit` acota la cantidad de repositorios procesados y por defecto es 50. El valor debe estar entre 1 y 50; si la organizacion tiene menos repositorios, se procesan los disponibles sin fallar.

El JSON incluye todos los repositorios, sus estados, lenguajes, hallazgos de CodeQL, vulnerabilidades de Grype y los metadatos del SBOM: nombre completo, commit, fecha de generacion, version de Syft, estado, cantidad de componentes y ruta al archivo CycloneDX. El resumen informa por separado los fallos de clonacion/analisis, los de SBOM, los de Grype y los analisis de Grype omitidos (`grype_skipped_repositories`), ademas del total de vulnerabilidades. `total_findings` cuenta todos los registros del dataset consolidado (CodeQL mas Grype), por lo que coincide con la longitud del arreglo `findings`. Los SBOMs originales permanecen como archivos independientes. Los estados `generated`, `empty` y `failed` distinguen respectivamente una generacion con componentes, una generacion valida sin componentes y un error. Los fallos individuales no interrumpen el procesamiento, pero hacen que el comando termine con codigo 1.

Si Grype esta configurado con un umbral de fallo (`--fail-on`, `GRYPE_FAIL_ON_SEVERITY` o `.grype.yaml`), puede terminar con codigo distinto de cero y aun asi emitir el documento JSON completo; en ese caso `miner` conserva las vulnerabilidades y no marca el analisis como fallido.

### Dataset consolidado de hallazgos

Ademas de los resultados por repositorio, el JSON de `scan` incluye en su raiz el arreglo `findings`. Cada entrada es un hallazgo normalizado que relaciona el resultado con su repositorio de origen y puede consumirse sin transformaciones manuales. Sus atributos son:

- `repository`: nombre completo del repositorio de origen (`organizacion/repositorio`).
- `tool`: herramienta que detecto el hallazgo (`codeql` o `grype`).
- `vulnerability_type`: tipo de vulnerabilidad; el identificador de la consulta CodeQL o el identificador de la vulnerabilidad de Grype (por ejemplo, `CVE-2021-1234`).
- `severity`: severidad reportada cuando esta disponible.
- `location`: ubicacion del hallazgo; archivo en CodeQL o ruta del artefacto en Grype.
- `line`: linea del archivo cuando aplica (solo CodeQL).
- `package`, `version`, `fixed_version`, `artifact_type`: datos del paquete afectado (solo Grype).
- `language`: lenguaje analizado (solo CodeQL).
- `message`: descripcion del hallazgo.

Los registros se ordenan de forma estable por repositorio, herramienta y ubicacion, de modo que dos ejecuciones sobre el mismo estado producen el mismo orden. Los hallazgos por repositorio siguen disponibles en `repositories[].findings` y `repositories[].grype`.

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

## Visualizer

El frontend independiente está en [`visualizer/`](visualizer/). Para ejecutarlo, consulta su [guía de instalación y uso](visualizer/README.md). La aplicación carga exclusivamente las salidas CSV/JSON generadas bajo `analyzer/output/`, las combina y las procesa en el navegador sin enviarlas a un servidor.

## Analyzer (notebooks)

Tras `miner scan`, los notebooks en `analyzer/notebooks/` consolidan `results.json` y los SBOMs en tablas y graficos bajo `analyzer/output/`. El script `analyzer/run_analyzer.sh` instala las dependencias del analyzer (`analyzer/requirements.txt`) si faltan y ejecuta ambos notebooks de forma headless:

```bash
miner scan --organization example-org --output results.json
./analyzer/run_analyzer.sh
```

Variables de entorno opcionales (los defaults asumen la estructura estandar del repo):

- `ANALYZER_RESULTS_JSON`: ruta a `results.json` (default `../../results.json` relativo a `analyzer/notebooks/`).
- `ANALYZER_SBOM_DIR`: carpeta con los `*.cdx.json` (default `../../results-sboms`).
- `ANALYZER_OUTPUT_DIR`: carpeta de salida (default `../output`, es decir `analyzer/output/`).

No requiere el paquete `rm-miner` ni `GITHUB_TOKEN`; solo los archivos generados por el miner.

## Reporter: auditoría del propio proyecto

Reporter es independiente de `miner scan` y `miner sbom`: no usa sus resultados, no clona repositorios ni requiere paquetes Python adicionales. Analiza exclusivamente archivos versionados en la raíz Git indicada de **rm-miner**, nunca los repositorios descargados en `.miner-work/`, `workspace/` u otros directorios sin seguimiento. Rechaza ejecutar desde un clon anidado o un proyecto distinto. Los enlaces simbólicos no se leen.

Configure `REPORTER_API_KEY` y `REPORTER_MODEL` para una API compatible con Chat Completions; opcionalmente, `REPORTER_API_URL` (HTTPS; por defecto `https://api.openai.com/v1/chat/completions`). No se carga `.env` ni se usa `GITHUB_TOKEN`.

```bash
PYTHONPATH=src python -m miner.reporter --repository . --output .reporter-output/security-report.md
```

El comando siempre intenta guardar un Markdown con commit, alcance, evidencias y recomendaciones. Devuelve código 1 si falta el modelo, falla su respuesta o la cobertura es incompleta; en ese caso el archivo indica que la auditoría no concluyó. No se transmiten archivos completos al proveedor: solo líneas candidatas filtradas, sin líneas que parezcan contener credenciales, y con literales de código ocultos. **Evite auditar código confidencial con un proveedor externo sin autorización.** La detección es heurística: se centra en algunos patrones de ejecución dinámica, TLS, configuraciones, dependencias declaradas y workflows. No comprueba CVE ni garantiza una revisión exhaustiva de dependencias o configuraciones. Los resultados del modelo se presentan como asuntos que requieren revisión, no como vulnerabilidades confirmadas.

El workflow `.github/workflows/reporter-security.yml` ejecuta la auditoría semanalmente o bajo demanda sobre el propio checkout. Guarde el secreto `REPORTER_API_KEY` y la variable `REPORTER_MODEL` en el repositorio; `REPORTER_API_URL` es opcional. El reporte queda disponible durante 30 días como artifact `rm-miner-security-report`, incluso si el modelo falla tras iniciar la auditoría. El workflow no publica issues ni modifica archivos versionados.
