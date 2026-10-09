import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { importAnalyzerFiles } from "../adapters/analyzerOutputs";
import { sampleAnalyzerFiles } from "../adapters/analyzerOutputs.sample";
import { AnalyzerDashboardPage } from "./AnalyzerDashboardPage";

describe("dashboard de Analyzer", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));

  it("muestra un apartado a la vez desde el menú lateral", () => {
    render(<AnalyzerDashboardPage data={importAnalyzerFiles(sampleAnalyzerFiles)} error="" onChooseFile={() => undefined} onClose={() => undefined} />);

    expect(screen.getByRole("heading", { name: /resumen de seguridad integrado/i })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: /hallazgos de analyzer/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /hallazgos/i }));
    expect(screen.getByRole("heading", { name: /hallazgos de analyzer/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /hallazgos de analyzer/i })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: /resumen sbom por repositorio/i })).not.toBeInTheDocument();
    expect(window.location.hash).toBe("#hallazgos");

    fireEvent.click(screen.getByRole("link", { name: /composición sbom/i }));
    expect(screen.getByRole("heading", { name: /resumen de resultados sbom/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /resumen sbom por repositorio/i })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: /hallazgos de analyzer/i })).not.toBeInTheDocument();
  });

  it("restaura la vista desde el hash y responde a su navegación", async () => {
    window.history.replaceState(null, "", "/#repositorios");
    render(<AnalyzerDashboardPage data={importAnalyzerFiles(sampleAnalyzerFiles)} error="" onChooseFile={() => undefined} onClose={() => undefined} />);

    expect(screen.getByRole("heading", { name: /resumen por repositorio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /repositorios/i })).toHaveAttribute("aria-current", "page");

    window.location.hash = "#conclusiones";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitFor(() => expect(screen.getByRole("heading", { name: /conclusiones del análisis/i })).toBeInTheDocument());
  });

  it("vuelve al resumen si se solicita SBOM sin datos SBOM", async () => {
    window.history.replaceState(null, "", "/#sbom");
    const data = { ...importAnalyzerFiles(sampleAnalyzerFiles), sbom: null };
    render(<AnalyzerDashboardPage data={data} error="" onChooseFile={() => undefined} onClose={() => undefined} />);

    expect(screen.queryByRole("link", { name: /composición sbom/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /resumen de seguridad integrado/i })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe("#resumen"));
  });
});
