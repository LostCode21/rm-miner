#!/usr/bin/env bash
# Ejecuta el pipeline del analyzer: corre los notebooks de forma headless.
#
# Variables de entorno opcionales:
#   ANALYZER_RESULTS_JSON  Ruta a results.json          (default: ../../results.json)
#   ANALYZER_SBOM_DIR      Carpeta con SBOMs *.cdx.json (default: ../../results-sboms)
#   ANALYZER_OUTPUT_DIR    Carpeta de salida            (default: ../output)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Instala las dependencias del analyzer si faltan.
if ! python3 -c "import pandas, matplotlib, nbconvert" 2>/dev/null; then
    echo "Faltan dependencias del analyzer; instalando desde ${SCRIPT_DIR}/requirements.txt..."
    python3 -m pip install -r "${SCRIPT_DIR}/requirements.txt"
fi

cd "${SCRIPT_DIR}/notebooks"

export ANALYZER_RESULTS_JSON="${ANALYZER_RESULTS_JSON:-../../results.json}"
export ANALYZER_SBOM_DIR="${ANALYZER_SBOM_DIR:-../../results-sboms}"
export ANALYZER_OUTPUT_DIR="${ANALYZER_OUTPUT_DIR:-../output}"

jupyter nbconvert --to notebook --execute --inplace \
    results_tanstack_analysis_results.ipynb

jupyter nbconvert --to notebook --execute --inplace \
    sbom_tanstack.ipynb

echo "Analyzer completado. Resultados en: ${ANALYZER_OUTPUT_DIR}"
