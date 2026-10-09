import { describe, expect, it } from "vitest";
import { AnalyzerDataError, importAnalyzerFiles, parseCsv } from "./analyzerOutputs";
import { sampleAnalyzerFiles } from "./analyzerOutputs.sample";

describe("importación de salidas de Analyzer", () => {
  it("combina CSV y JSON sin duplicar hallazgos", () => {
    const result = importAnalyzerFiles(sampleAnalyzerFiles);

    expect(result.sourceFormat).toBe("analyzer-results-bundle");
    expect(result.organization).toBe("TanStack");
    expect(result.findings).toHaveLength(2);
    expect(result.repositories).toHaveLength(2);
    expect(result.warnings).toEqual([]);
    expect(result.findings[0]).toMatchObject({
      tool: "codeql",
      message: "Entrada, sin validar",
      isTest: false,
      severity: "medium",
    });
    expect(result.findings[1]).toMatchObject({ tool: "grype", severityWeight: 3, severity: "high" });
    expect(result.sbom).toMatchObject({ sbomCount: 2, uniqueComponents: 2, rawComponentOccurrences: 3, dependencyEdges: 2 });
    expect(result.sbom?.sharedPackages[0]).toMatchObject({ name: "react", repositories: 1 });
  });

  it("analiza campos CSV con comas, comillas y saltos de línea", () => {
    const rows = parseCsv('name,message\napi,"texto, con ""comillas""\ny otra línea"\n', "sample.csv");
    expect(rows).toEqual([{ name: "api", message: 'texto, con "comillas"\ny otra línea' }]);
  });

  it("puede reconstruir un análisis parcial y advierte los archivos faltantes", () => {
    const result = importAnalyzerFiles([sampleAnalyzerFiles[0]]);
    expect(result.findings).toHaveLength(2);
    expect(result.repositories).toHaveLength(2);
    expect(result.warnings.join(" ")).toMatch(/Faltan salidas de Analyzer/);
  });

  it("rechaza archivos sin un esquema reconocido", () => {
    expect(() => importAnalyzerFiles([{ name: "otro.csv", content: "foo,bar\n1,2\n" }]))
      .toThrow(AnalyzerDataError);
  });

  it("rechaza resultados de Miner y SBOM CycloneDX originales", () => {
    expect(() => importAnalyzerFiles([{ name: "results.json", content: "{}" }])).toThrow(/analyzer\/output/i);
    expect(() => importAnalyzerFiles([{ name: "api.cdx.json", content: "{}" }])).toThrow(/analyzer\/output/i);
  });

  it("prioriza el resumen JSON y advierte si difiere del CSV", () => {
    const files = sampleAnalyzerFiles.map((file) => file.name === "repository_integrated_summary.csv"
      ? { ...file, content: file.content.replace("TanStack/api,1,0,1", "TanStack/api,9,0,9") }
      : file);
    const result = importAnalyzerFiles(files);
    expect(result.repositories[0].codeqlFindings).toBe(1);
    expect(result.warnings.join(" ")).toMatch(/no coinciden/);
  });

  it("ignora de forma explícita archivos duplicados", () => {
    const result = importAnalyzerFiles([...sampleAnalyzerFiles, sampleAnalyzerFiles[0]]);
    expect(result.findings).toHaveLength(2);
    expect(result.warnings.join(" ")).toMatch(/ya se había cargado/);
  });
});
