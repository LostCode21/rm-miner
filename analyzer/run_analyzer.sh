#!/usr/bin/env bash
# Ejecuta el pipeline del analyzer sin modificar los notebooks fuente.
#
# Variables de entorno opcionales:
#   ANALYZER_RESULTS_JSON  Ruta a results.json          (default: ../../results.json)
#   ANALYZER_SBOM_DIR      Carpeta con SBOMs *.cdx.json (default: ../../results-sboms)
#   ANALYZER_OUTPUT_DIR    Carpeta de salida            (default: ../output)
#   ANALYZER_EXECUTED_NOTEBOOK_DIR Copias ejecutadas     (default: output/executed-notebooks)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Instala las dependencias del analyzer si faltan.
if ! python3 -c "import pandas, matplotlib, nbconvert" 2>/dev/null; then
    echo "Faltan dependencias del analyzer; instalando desde ${SCRIPT_DIR}/requirements.txt..."
    python3 -m pip install -r "${SCRIPT_DIR}/requirements.txt"
fi

export ANALYZER_RESULTS_JSON="$(realpath -m "${ANALYZER_RESULTS_JSON:-${SCRIPT_DIR}/../results.json}")"
export ANALYZER_SBOM_DIR="$(realpath -m "${ANALYZER_SBOM_DIR:-${SCRIPT_DIR}/../results-sboms}")"
export ANALYZER_OUTPUT_DIR="$(realpath -m "${ANALYZER_OUTPUT_DIR:-${SCRIPT_DIR}/output}")"
ANALYZER_EXECUTED_NOTEBOOK_DIR="$(realpath -m "${ANALYZER_EXECUTED_NOTEBOOK_DIR:-${ANALYZER_OUTPUT_DIR}/executed-notebooks}")"

mkdir -p "${ANALYZER_OUTPUT_DIR}" "${ANALYZER_EXECUTED_NOTEBOOK_DIR}"
cd "${SCRIPT_DIR}/notebooks"

jupyter nbconvert --to notebook --execute \
    --output-dir "${ANALYZER_EXECUTED_NOTEBOOK_DIR}" \
    --output results_tanstack_analysis_results.ipynb \
    results_tanstack_analysis_results.ipynb

jupyter nbconvert --to notebook --execute \
    --output-dir "${ANALYZER_EXECUTED_NOTEBOOK_DIR}" \
    --output sbom_tanstack.ipynb \
    sbom_tanstack.ipynb

echo "Analyzer completado. Resultados en: ${ANALYZER_OUTPUT_DIR}"
echo "Notebooks ejecutados en: ${ANALYZER_EXECUTED_NOTEBOOK_DIR}"
