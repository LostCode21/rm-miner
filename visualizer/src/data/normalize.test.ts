import { describe, expect, it } from "vitest";
import { MinerDataError, parseMinerScan } from "./normalize";

describe("parseMinerScan", () => {
  it("normaliza el arreglo raíz de hallazgos sin duplicar los anidados", () => {
    const data = parseMinerScan({
      organization: "acme",
      repositories: [{
        name: "api",
        status: "analyzed",
        findings: [{ rule_id: "py/test", message: "CodeQL finding", language: "Python" }],
        grype: { status: "analyzed", vulnerabilities: [{ id: "CVE-1", package: "lib" }] },
      }],
      findings: [{ repository: "acme/api", tool: "codeql", vulnerability_type: "py/test", message: "CodeQL finding" }],
      summary: { total_repositories: 1, total_findings: 1 },
    });

    expect(data.findings).toHaveLength(1);
    expect(data.findings[0]).toMatchObject({ repository: "acme/api", tool: "codeql", vulnerabilityType: "py/test" });
    expect(data.summary.totalFindings).toBe(1);
  });

  it("reconstruye hallazgos cuando solo están disponibles los datos por repositorio", () => {
    const data = parseMinerScan({
      organization: "acme",
      repositories: [{
        name: "api",
        status: "analyzed",
        findings: [{ rule_id: "py/test", message: "CodeQL finding", start_line: 9 }],
        grype: { status: "analyzed", vulnerabilities: [{ id: "CVE-1", package: "lib", severity: "High" }] },
      }],
    });

    expect(data.findings).toHaveLength(2);
    expect(data.findings.map((finding) => finding.tool)).toEqual(["codeql", "grype"]);
    expect(data.warnings.some((warning) => warning.includes("reconstruyeron"))).toBe(true);
    expect(data.summary.totalFindings).toBe(2);
  });

  it("advierte ante campos ausentes y calcula métricas disponibles", () => {
    const data = parseMinerScan({ organization: "acme", findings: [] });
    expect(data.summary.totalRepositories).toBe(0);
    expect(data.warnings.length).toBeGreaterThan(0);
  });

  it("conserva hallazgos parciales y añade repositorios sin metadatos", () => {
    const data = parseMinerScan({
      organization: "acme",
      findings: [{ repository: "acme/api", tool: "codeql", vulnerability_type: "rule/example" }],
    });

    expect(data.repositories).toMatchObject([{ fullName: "acme/api", status: "unknown" }]);
    expect(data.summary.totalRepositories).toBe(1);
  });

  it("omite hallazgos con herramienta no reconocida en lugar de asumir CodeQL", () => {
    const data = parseMinerScan({
      organization: "acme",
      repositories: [],
      findings: [{ repository: "acme/api", vulnerability_type: "unknown-tool-finding" }],
    });

    expect(data.findings).toHaveLength(0);
    expect(data.warnings.some((warning) => warning.includes("hallazgos incompletos"))).toBe(true);
  });

  it("rechaza un objeto sin la estructura de resultados Miner", () => {
    expect(() => parseMinerScan({ random: true })).toThrow(MinerDataError);
    expect(() => parseMinerScan(null)).toThrow("objeto JSON");
  });
});
