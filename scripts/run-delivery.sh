#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'EOF'
Uso: ./scripts/run-delivery.sh ORGANIZACION [LIMITE]

Genera las evidencias de Miner, Analyzer y Reporter en deliverables/.
Variables opcionales:
  DELIVERY_DIR     Directorio de salida (default: ./deliverables)
  MINER_WORKSPACE  Clones persistentes (default: ./.miner-work)
EOF
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
    usage >&2
    exit 2
fi

ORGANIZATION="$1"
LIMIT="${2:-50}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DELIVERY_DIR="${DELIVERY_DIR:-${ROOT}/deliverables}"
MINER_WORKSPACE="${MINER_WORKSPACE:-${ROOT}/.miner-work}"

if ! git -C "${ROOT}" rev-parse --show-toplevel >/dev/null 2>&1; then
    echo "Git no puede acceder a los metadatos del checkout." >&2
    echo "Si usa un worktree enlazado, abra el clon principal en el Dev Container o monte también su directorio Git común." >&2
    exit 2
fi

if ! [[ "${LIMIT}" =~ ^[0-9]+$ ]] || (( LIMIT < 1 || LIMIT > 50 )); then
    echo "El límite debe ser un entero entre 1 y 50." >&2
    exit 2
fi

if [[ -e "${DELIVERY_DIR}" ]]; then
    echo "El directorio de entrega ya existe: ${DELIVERY_DIR}" >&2
    echo "Revíselo y elimínelo manualmente antes de generar una entrega nueva." >&2
    exit 2
fi

for command in git python miner codeql syft grype jupyter node npm sha256sum; do
    if ! command -v "${command}" >/dev/null 2>&1; then
        echo "Falta la herramienta requerida: ${command}" >&2
        exit 2
    fi
done

if [[ -z "${REPORTER_API_KEY:-}" || -z "${REPORTER_MODEL:-}" ]]; then
    echo "Defina REPORTER_API_KEY y REPORTER_MODEL para producir un reporte completo." >&2
    exit 2
fi

if [[ -n "$(git -C "${ROOT}" status --porcelain --untracked-files=normal)" ]]; then
    echo "Hay cambios o archivos sin confirmar. Genere la entrega desde un commit limpio." >&2
    exit 2
fi

mkdir -p "${DELIVERY_DIR}/miner" "${DELIVERY_DIR}/analyzer/output" \
    "${DELIVERY_DIR}/analyzer/executed-notebooks" "${DELIVERY_DIR}/reporter" \
    "${DELIVERY_DIR}/metadata"

cd "${ROOT}"

echo "[1/6] Ejecutando pruebas Python..."
python -m pytest

echo "[2/6] Verificando Visualizer..."
npm --prefix visualizer test
npm --prefix visualizer run build

echo "[3/6] Ejecutando Miner..."
set +e
miner scan \
    --organization "${ORGANIZATION}" \
    --limit "${LIMIT}" \
    --workspace "${MINER_WORKSPACE}" \
    --output "${DELIVERY_DIR}/miner/results.json"
MINER_STATUS=$?
set -e

if [[ ! -s "${DELIVERY_DIR}/miner/results.json" ]]; then
    echo "Miner no produjo results.json; no es posible continuar con Analyzer." >&2
    exit 1
fi

echo "[4/6] Ejecutando Analyzer sin modificar los notebooks fuente..."
set +e
ANALYZER_RESULTS_JSON="${DELIVERY_DIR}/miner/results.json" \
ANALYZER_SBOM_DIR="${DELIVERY_DIR}/miner/results-sboms" \
ANALYZER_OUTPUT_DIR="${DELIVERY_DIR}/analyzer/output" \
ANALYZER_EXECUTED_NOTEBOOK_DIR="${DELIVERY_DIR}/analyzer/executed-notebooks" \
    ./analyzer/run_analyzer.sh
ANALYZER_STATUS=$?
set -e

echo "[5/6] Auditando el propio proyecto con Reporter..."
set +e
PYTHONPATH=src python -m miner.reporter \
    --repository "${ROOT}" \
    --output "${DELIVERY_DIR}/reporter/security-report.md"
REPORTER_STATUS=$?
set -e

echo "[6/6] Registrando metadatos y checksums..."
COMMIT="$(git -C "${ROOT}" rev-parse HEAD)"
GENERATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > "${DELIVERY_DIR}/metadata/execution-info.md" <<EOF
# Información de ejecución

- Fecha UTC: ${GENERATED_AT}
- Commit fuente: \`${COMMIT}\`
- Organización analizada: \`${ORGANIZATION}\`
- Límite solicitado: ${LIMIT}
- Estado Miner: ${MINER_STATUS}
- Estado Analyzer: ${ANALYZER_STATUS}
- Estado Reporter: ${REPORTER_STATUS}

Un estado distinto de cero indica que el componente informó resultados parciales o una ejecución incompleta y debe revisarse antes de publicar el release.
EOF

{
    python --version
    node --version
    npm --version
    git --version
    codeql version --format=terse
    syft version
    grype version
} > "${DELIVERY_DIR}/metadata/tool-versions.txt" 2>&1

(
    cd "${DELIVERY_DIR}"
    find . -type f ! -name SHA256SUMS -print0 \
        | sort -z \
        | xargs -0 sha256sum > metadata/SHA256SUMS
)

if (( MINER_STATUS != 0 || ANALYZER_STATUS != 0 || REPORTER_STATUS != 0 )); then
    echo "La entrega se generó con componentes incompletos. Revise ${DELIVERY_DIR}/metadata/execution-info.md" >&2
    exit 1
fi

echo "Entrega generada correctamente en ${DELIVERY_DIR}"
