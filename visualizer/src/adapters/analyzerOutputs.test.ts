import { describe, expect, it } from "vitest";
import {
  analyzerRepositorySummaryAdapter,
  analyzerSbomRepositoryAdapter,
  analyzerSecurityConcentrationAdapter,
  analyzerSharedPackagesAdapter,
  AnalyzerDataError,
} from "./analyzerOutputs";
import {
  sampleAnalyzerRepositorySummary,
  sampleAnalyzerSbomRepositorySummary,
  sampleAnalyzerSecurityConcentration,
  sampleAnalyzerSharedPackages,
} from "./analyzerOutputs.sample";

describe("adaptadores de Analyzer", () => {
  it("normaliza el resumen de repositorios", () => {
    const result = analyzerRepositorySummaryAdapter.parse(sampleAnalyzerRepositorySummary, "repository_summary.json");
    expect(result).toMatchObject({
      kind: "analyzer",
      sourceFormat: "analyzer-repository-summary",
      sourceName: "repository_summary.json",
      rows: [{ repository: "api", totalFindings: 18, securityPercentage: 61.11 }],
    });
  });

  it("distingue los cuatro esquemas sin depender del nombre del archivo", () => {
    expect(analyzerRepositorySummaryAdapter.supports(sampleAnalyzerRepositorySummary)).toBe(true);
    expect(analyzerSecurityConcentrationAdapter.supports(sampleAnalyzerSecurityConcentration)).toBe(true);
    expect(analyzerSbomRepositoryAdapter.supports(sampleAnalyzerSbomRepositorySummary)).toBe(true);
    expect(analyzerSharedPackagesAdapter.supports(sampleAnalyzerSharedPackages)).toBe(true);
    expect(analyzerRepositorySummaryAdapter.supports(sampleAnalyzerSecurityConcentration)).toBe(false);
  });

  it("rechaza filas incompletas después de reconocer el esquema", () => {
    const malformed = [{ ...sampleAnalyzerRepositorySummary[0], total_findings: -1 }];
    expect(() => analyzerRepositorySummaryAdapter.parse(malformed, "repository_summary.json"))
      .toThrow(AnalyzerDataError);
  });
});
