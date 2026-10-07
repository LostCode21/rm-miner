import { describe, expect, it } from "vitest";
import { AmbiguousScanFormatError, importScanResult, UnsupportedScanFormatError } from "./importScan";
import { sampleMinerScan } from "../adapters/minerScan.sample";

describe("importScanResult", () => {
  it("selecciona el adaptador de Miner y devuelve el modelo de dominio", () => {
    const scan = importScanResult(sampleMinerScan, "scan.json");

    expect(scan.sourceFormat).toBe("miner-scan");
    expect(scan.sourceName).toBe("scan.json");
    expect(scan.findings[0]).toMatchObject({
      tool: "codeql",
      severity: "high",
      sourceSeverity: "error",
    });
  });

  it("rechaza con claridad formatos que ningún adaptador reconoce", () => {
    expect(() => importScanResult({ generatedBy: "analyzer" }, "analyzer.json"))
      .toThrow(UnsupportedScanFormatError);
  });

  it("rechaza formatos que coinciden con más de un adaptador", () => {
    const overlappingAdapter = {
      id: "another-format",
      supports: () => true,
      parse: () => ({
        organization: "acme",
        summary: {
          organization: "acme",
          totalRepositories: 0,
          analyzedRepositories: 0,
          failedRepositories: 0,
          unsupportedRepositories: 0,
          totalFindings: 0,
          totalVulnerabilities: 0,
          repositoriesWithErrors: null,
          failureBreakdown: [],
          vulnerabilityBreakdown: [],
        },
        repositories: [],
        findings: [],
        warnings: [],
        sourceName: "scan.json",
      }),
    };

    expect(() => importScanResult(sampleMinerScan, "scan.json", [
      { id: "miner", supports: () => true, parse: overlappingAdapter.parse },
      overlappingAdapter,
    ])).toThrow(AmbiguousScanFormatError);
  });
});
