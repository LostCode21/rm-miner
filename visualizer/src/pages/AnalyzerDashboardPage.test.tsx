import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { importAnalyzerFiles } from "../adapters/analyzerOutputs";
import { sampleAnalyzerFiles } from "../adapters/analyzerOutputs.sample";
import { AnalyzerDashboardPage } from "./AnalyzerDashboardPage";

describe("dashboard de Analyzer", () => {
  it("presenta resúmenes SBOM y conclusiones sin alterar el flujo de hallazgos", () => {
    render(<AnalyzerDashboardPage data={importAnalyzerFiles(sampleAnalyzerFiles)} error="" onChooseFile={() => undefined} onClose={() => undefined} />);

    expect(screen.getByRole("heading", { name: /conclusiones del análisis/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /resumen de resultados sbom/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /resumen sbom por repositorio/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /hallazgos de analyzer/i })).toBeInTheDocument();
  });
});
