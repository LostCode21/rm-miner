import json
from io import BytesIO

import pytest

from miner.reporter import __main__ as reporter


def project(tmp_path):
    (tmp_path / "pyproject.toml").write_text('[project]\nname = "rm-miner"\n', encoding="utf-8")
    (tmp_path / "src/miner").mkdir(parents=True)
    (tmp_path / "src/miner/scanner.py").write_text("eval(input())\n", encoding="utf-8")
    (tmp_path / ".miner-work/foreign").mkdir(parents=True)
    (tmp_path / ".miner-work/foreign/unsafe.py").write_text("eval(input())\n", encoding="utf-8")
    (tmp_path / "outside.py").symlink_to(tmp_path / ".miner-work/foreign/unsafe.py")
    return tmp_path


def fake_git(monkeypatch, root, paths):
    def git(_, *args):
        if args[0] == "rev-parse":
            return (str(root) if args[1] == "--show-toplevel" else "abcdef").encode()
        return b"\0".join(path.encode() for path in paths) + b"\0"

    monkeypatch.setattr(reporter, "_git", git)


def test_inventory_excludes_clones_and_symlinks_even_when_listed(monkeypatch, tmp_path):
    root = project(tmp_path)
    (root / "deliverables").mkdir()
    (root / "deliverables/results.json").write_text('{"unsafe": "eval(input())"}', encoding="utf-8")
    fake_git(monkeypatch, root, [
        "src/miner/scanner.py",
        ".miner-work/foreign/unsafe.py",
        "deliverables/results.json",
        "outside.py",
    ])
    commit, files, omitted = reporter.inventory(root)
    assert commit == "abcdef"
    assert [name for name, _ in files] == ["src/miner/scanner.py"]
    assert "outside.py" in omitted[0]


def test_inventory_rejects_nested_root(monkeypatch, tmp_path):
    root = project(tmp_path)
    fake_git(monkeypatch, root, [])
    with pytest.raises(ValueError, match="raiz Git"):
        reporter.inventory(root / ".miner-work")


def test_inventory_keeps_own_codeql_source(monkeypatch, tmp_path):
    root = project(tmp_path)
    (root / "src/miner/codeql").mkdir()
    (root / "src/miner/codeql/runner.py").write_text("pass\n", encoding="utf-8")
    fake_git(monkeypatch, root, ["src/miner/codeql/runner.py"])
    _, files, _ = reporter.inventory(root)
    assert [name for name, _ in files] == ["src/miner/codeql/runner.py"]


def test_candidates_do_not_send_possible_secrets():
    items, truncated = reporter.candidates([
        ("src/miner/x.py", ["eval(user_input)", "api_key = 'private'; eval(api_key)"]),
        (".github/workflows/check.yml", ["- uses: actions/checkout@v4"]),
    ])
    assert not truncated
    assert [item["category"] for item in items] == ["command-execution", "supply-chain"]
    assert all("private" not in str(item) for item in items)


def test_model_cannot_invent_evidence_or_confirm_vulnerability(monkeypatch):
    monkeypatch.setenv("REPORTER_API_KEY", "secret")
    monkeypatch.setenv("REPORTER_MODEL", "test-model")
    monkeypatch.delenv("REPORTER_API_URL", raising=False)
    item = {"id": 1, "category": "network", "file": "src/miner/x.py", "line": 2, "evidence": "verify=False", "context": "TLS"}

    def urlopen(req, timeout):
        assert "secret" not in req.data.decode()
        return BytesIO(json.dumps({"choices": [{"message": {"content": json.dumps({"findings": [
            {"id": 1, "status": "confirmed", "severity": "high", "explanation": "TLS sin verificar", "recommendation": "Validar certificados"}
        ]})}}]}).encode())

    monkeypatch.setattr(reporter.request, "urlopen", urlopen)
    findings = reporter.interpret([item])
    assert findings[0]["status"] == "review"
    assert findings[0]["file"] == item["file"]

    def hallucinate(req, timeout):
        return BytesIO(b'{"choices":[{"message":{"content":"{\\"findings\\":[{\\"id\\":999}]}"}}]}')

    monkeypatch.setattr(reporter.request, "urlopen", hallucinate)
    with pytest.raises(ValueError, match="desconocido"):
        reporter.interpret([item])


def test_missing_model_writes_incomplete_report(monkeypatch, tmp_path):
    root = project(tmp_path)
    fake_git(monkeypatch, root, ["src/miner/scanner.py"])
    monkeypatch.delenv("REPORTER_API_KEY", raising=False)
    monkeypatch.delenv("REPORTER_MODEL", raising=False)
    output = root / ".reporter-output/security-report.md"
    assert reporter.main(["--repository", str(root), "--output", str(output)]) == 1
    text = output.read_text(encoding="utf-8")
    assert "incompleta" in text
    assert "abcdef" in text
    assert "foreign" not in text
