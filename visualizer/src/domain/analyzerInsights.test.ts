import { describe, expect, it } from "vitest";
import { importAnalyzerFiles } from "../adapters/analyzerOutputs";
import { sampleAnalyzerFiles } from "../adapters/analyzerOutputs.sample";
import { deriveAnalyzerInsights } from "./analyzerInsights";

describe("conclusiones de Analyzer", () => {
  it("deriva observaciones de seguridad, resultados SBOM y metodología", () => {
    const insights = deriveAnalyzerInsights(importAnalyzerFiles(sampleAnalyzerFiles));

    expect(insights.securityObservations.join(" ")).toMatch(/2 hallazgos/);
    expect(insights.sbomResults.join(" ")).toMatch(/2 SBOM/);
    expect(insights.sbomResults.join(" ")).toMatch(/2 componentes únicos/);
    expect(insights.methodology.join(" ")).toMatch(/CodeQL/);
    expect(insights.methodology.join(" ")).toMatch(/Grype/);
  });
});
