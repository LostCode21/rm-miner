import { describe, expect, it } from "vitest";
import { importScanResult, UnsupportedScanFormatError } from "./importScan";
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
});
