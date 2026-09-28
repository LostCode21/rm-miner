"""Convierte resultados SARIF de CodeQL en hallazgos del dominio."""

from __future__ import annotations

import json
from pathlib import Path

from miner.models import Finding


def parse_sarif(path: Path, language: str) -> list[Finding]:
    document = json.loads(path.read_text(encoding="utf-8"))
    findings: list[Finding] = []
    for run in document.get("runs", []):
        rules = {
            rule.get("id"): rule
            for rule in run.get("tool", {}).get("driver", {}).get("rules", [])
            if rule.get("id")
        }
        for result in run.get("results", []):
            location = (result.get("locations") or [{}])[0].get("physicalLocation", {})
            region = location.get("region", {})
            rule_id = result.get("ruleId", "unknown")
            rule = rules.get(rule_id, {})
            findings.append(
                Finding(
                    rule_id=rule_id,
                    severity=result.get("level") or rule.get("defaultConfiguration", {}).get("level"),
                    message=result.get("message", {}).get("text", ""),
                    file=location.get("artifactLocation", {}).get("uri"),
                    start_line=region.get("startLine"),
                    language=language,
                )
            )
    return sorted(
        findings,
        key=lambda finding: (finding.file or "", finding.start_line or 0, finding.rule_id),
    )
