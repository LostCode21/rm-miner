import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { sampleAnalyzerFiles } from "./adapters/analyzerOutputs.sample";

const analyzerFiles = () => sampleAnalyzerFiles.map((source) => new File([source.content], source.name, {
  type: source.name.endsWith(".json") ? "application/json" : "text/csv",
}));

describe("Visualizer", () => {
  it("muestra un ejemplo compuesto exclusivamente por salidas de Analyzer", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /ver datos de ejemplo/i }));

    expect(await screen.findByRole("heading", { name: /resumen de seguridad integrado/i })).toBeInTheDocument();
    expect(screen.getByText("18 archivos de Analyzer")).toBeInTheDocument();
  });

  it("carga conjuntamente la carpeta de outputs de Analyzer", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Seleccionar carpeta de Analyzer"), { target: { files: analyzerFiles() } });

    expect(await screen.findByRole("heading", { name: /resumen de seguridad integrado/i, level: 1 })).toBeInTheDocument();
    const findingsTable = screen.getByRole("table", { name: /hallazgos de analyzer/i });
    expect(within(findingsTable).getByText("js/sql-injection")).toBeInTheDocument();
    expect(within(findingsTable).getByText("CVE-2026-0001")).toBeInTheDocument();
  });

  it("rechaza results.json porque no es una salida de Analyzer", async () => {
    render(<App />);
    const file = new File(["{}"], "results.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Seleccionar carpeta de Analyzer"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/analyzer\/output/i));
  });

  it("rechaza SBOM CycloneDX originales", async () => {
    render(<App />);
    const file = new File(["{}"], "api.cdx.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Seleccionar carpeta de Analyzer"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/analyzer\/output/i));
  });
});
