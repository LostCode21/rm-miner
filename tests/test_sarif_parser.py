import json

from miner.sarif.parser import parse_sarif


def test_parse_sarif_extracts_and_sorts_findings(tmp_path):
    sarif = tmp_path / "results.sarif"
    sarif.write_text(
        json.dumps(
            {
                "runs": [
                    {
                        "tool": {"driver": {"rules": [{"id": "rule-b", "defaultConfiguration": {"level": "warning"}}]}},
                        "results": [
                            {
                                "ruleId": "rule-b",
                                "message": {"text": "Second"},
                                "locations": [{"physicalLocation": {"artifactLocation": {"uri": "z.py"}, "region": {"startLine": 4}}}],
                            },
                            {
                                "ruleId": "rule-a",
                                "level": "error",
                                "message": {"text": "First"},
                                "locations": [{"physicalLocation": {"artifactLocation": {"uri": "a.py"}, "region": {"startLine": 2}}}],
                            },
                        ],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    findings = parse_sarif(sarif, "Python")

    assert [finding.rule_id for finding in findings] == ["rule-a", "rule-b"]
    assert findings[0].severity == "error"
    assert findings[1].severity == "warning"
