# Proceso de entrega

## 1. Release de código

Desde una rama integrada y con el árbol limpio:

```bash
python -m pytest
npm --prefix visualizer test
npm --prefix visualizer run build
git tag -a v1.0.0 -m "Entrega de código fuente v1.0.0"
git push origin v1.0.0
```

El release `v1.0.0` debe apuntar al commit que contiene la implementación, el Dev Container, los notebooks y la documentación, pero no los resultados variables.

## 2. Generación de evidencias

Exporte las credenciales solo en la terminal y ejecute desde el commit etiquetado:

```bash
git switch -c release/evidence-v1.0.0 v1.0.0
export GITHUB_TOKEN="..."       # opcional para repositorios públicos
export REPORTER_API_KEY="..."
export REPORTER_MODEL="..."
./scripts/run-delivery.sh ORGANIZACION 50
```

Revise `deliverables/metadata/execution-info.md`. Los tres estados deben ser cero. Compruebe también que el reporte sea completo y que no haya secretos ni rutas privadas en las evidencias.

## 3. Release de evidencias

```bash
git add deliverables
git commit -m "docs(delivery): agrega evidencias v1.0.0"
git tag -a evidence-v1.0.0 -m "Resultados y evidencias v1.0.0"
git push origin release/evidence-v1.0.0 evidence-v1.0.0
git archive --format=zip --output=deliverables-v1.0.0.zip HEAD:deliverables
```

Publique `deliverables-v1.0.0.zip` también como asset. El árbol del tag conserva las evidencias incluso si el asset deja de estar disponible.

## 4. Consulta de resultados publicados

El release
[`evidence-v1.0.0`](https://github.com/LostCode21/rm-miner/releases/tag/evidence-v1.0.0)
publica los resultados en paquetes separados y en un paquete completo:

- `miner-v1.0.0.zip`: resultado consolidado y SBOMs CycloneDX.
- `analyzer-v1.0.0.zip`: datasets CSV/JSON y notebooks ejecutados.
- `reporter-v1.0.0.zip`: reporte de seguridad del proyecto.
- `metadata-v1.0.0.zip`: información de ejecución, procedencia y checksums.
- `deliverables-v1.0.0.zip`: conjunto completo de evidencias.

En el árbol Git del tag, los mismos archivos se encuentran bajo
`deliverables/miner/`, `deliverables/analyzer/`, `deliverables/reporter/` y
`deliverables/metadata/`. Para comprobar una descarga, guarde también el
archivo `SHA256SUMS` publicado con los assets y ejecute:

```bash
sha256sum --check SHA256SUMS
```

Para usar Visualizer, descomprima `analyzer-v1.0.0.zip`, inicie la aplicación
según [`visualizer/README.md`](../visualizer/README.md) y seleccione
`analyzer/output/` mediante **Cargar carpeta Analyzer**.

## Contenido que no debe publicarse

- `.env` o tokens.
- `.miner-work/` y repositorios clonados.
- `.venv/` y `node_modules/`.
- cachés o bases temporales de CodeQL y Grype.
- reportes incompletos presentados como definitivos.
