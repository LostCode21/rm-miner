import { describe, expect, it } from "vitest";
import { MinerDataError, parseMinerScan } from "./minerScan";

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

  it("mantiene la relación de hallazgos con repositorios después de omitir una entrada inválida", () => {
    const data = parseMinerScan({
      organization: "acme",
      repositories: [null, { name: "api", status: "analyzed", findings: [{ rule_id: "rule/one", message: "Finding" }] }],
    });

    expect(data.findings).toMatchObject([{ repository: "acme/api", vulnerabilityType: "rule/one" }]);
    expect(data.warnings.some((warning) => warning.includes("formato no válido"))).toBe(true);
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

  it("conserva herramientas desconocidas sin etiquetarlas como CodeQL", () => {
    const data = parseMinerScan({
      organization: "acme",
      repositories: [],
      findings: [{ repository: "acme/api", tool: "unknown-tool", vulnerability_type: "unknown-tool-finding" }],
    });

    expect(data.findings).toMatchObject([{ tool: "unknown-tool", vulnerabilityType: "unknown-tool-finding" }]);
    expect(data.findings[0].severity).toBe("unknown");
  });

  it("rechaza un objeto sin la estructura de resultados Miner", () => {
    expect(() => parseMinerScan({ random: true })).toThrow(MinerDataError);
    expect(() => parseMinerScan(null)).toThrow("objeto JSON");
  });

  it("informa y reconcilia métricas del resumen con los registros válidos", () => {
    const data = parseMinerScan({
      organization: "acme",
      repositories: [{ name: "api", status: "analysis_failed" }],
      findings: [{ repository: "acme/api", tool: "codeql", vulnerability_type: "rule/valid" }],
      summary: { total_repositories: 1, total_findings: 4, total_vulnerabilities: 2, failed_repositories: 3 },
    });

    expect(data.summary.totalFindings).toBe(1);
    expect(data.summary.totalVulnerabilities).toBe(0);
    expect(data.summary.repositoriesWithErrors).toBe(1);
    expect(data.repositories[0].status).toBe("failed");
    expect(data.summary.failureBreakdown).toMatchObject([{ key: "analysis", label: "Análisis", count: 1 }]);
    expect(data.summary.failedRepositories).toBe(1);
    expect(data.warnings.some((warning) => warning.includes("4") && warning.includes("hallazgos"))).toBe(true);
    expect(data.warnings.some((warning) => warning.includes("2") && warning.includes("vulnerabilidades"))).toBe(true);
    expect(data.warnings.some((warning) => warning.includes("3 fallos de análisis") && warning.includes("1"))).toBe(true);
  });

  it("no presenta cero como cifra exacta si falta el detalle de repositorios", () => {
    const data = parseMinerScan({
      organization: "acme",
      findings: [],
      summary: { total_repositories: 3, failed_repositories: 2 },
    });

    expect(data.summary.repositoriesWithErrors).toBeNull();
  });

  it("no calcula un conteo exacto de errores si faltan estados de controles", () => {
    const data = parseMinerScan({
      organization: "acme",
      repositories: [{ name: "api", status: "analyzed" }],
      summary: { total_repositories: 1, failed_repositories: 0 },
    });

    expect(data.summary.repositoriesWithErrors).toBeNull();
  });
});
