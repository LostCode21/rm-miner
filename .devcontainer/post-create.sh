#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if [[ ! -x .venv/bin/python ]]; then
    python3 -m venv .venv
fi

.venv/bin/python -m pip install 'pip==26.2.1'
.venv/bin/python -m pip install -e '.[dev]' -r analyzer/requirements.txt
npm ci --prefix visualizer

echo "Entorno listo:"
.venv/bin/python --version
node --version
codeql version --format=terse
syft version
grype version
