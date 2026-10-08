import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { sampleMinerScan } from "./adapters/minerScan.sample";
import { sampleAnalyzerFiles } from "./adapters/analyzerOutputs.sample";

describe("Visualizer", () => {
  it("muestra los resultados de ejemplo y permite abrir el detalle de un hallazgo", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /ver datos de ejemplo/i }));

    expect(await screen.findByRole("heading", { name: /resumen de seguridad/i })).toBeInTheDocument();
    expect(screen.getAllByText("acme-security").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CVE-2024-3094").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /py\/sql-injection/i }));
    const detail = screen.getByRole("complementary", { name: "py/sql-injection" });
    expect(detail).toBeInTheDocument();
    expect(within(detail).getByText("src/api/users.py:87")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("complementary", { name: "py/sql-injection" })).not.toBeInTheDocument();
  });

  it("filtra hallazgos por herramienta", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /ver datos de ejemplo/i }));
    await screen.findByRole("heading", { name: /resumen de seguridad/i, level: 1 });
    fireEvent.change(screen.getByLabelText("Herramienta"), { target: { value: "grype" } });

    const table = screen.getByRole("table");
    expect(within(table).getByText("CVE-2024-3094")).toBeInTheDocument();
    expect(within(table).queryByText("py/sql-injection")).not.toBeInTheDocument();
  });

  it("muestra un error entendible si el archivo seleccionado contiene JSON malformado", async () => {
    render(<App />);
    const file = new File(["{ roto"], "resultados.json", { type: "application/json" });
    fireEvent.change(screen.getAllByLabelText("Seleccionar archivos de resultados")[0], { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/no contiene JSON válido/i));
  });

  it("distingue un error de lectura del error de formato JSON", async () => {
    const originalReadAsText = FileReader.prototype.readAsText;
    FileReader.prototype.readAsText = function readAsText() {
      this.dispatchEvent(new ProgressEvent("error"));
    };
    try {
      render(<App />);
      const file = new File(["{}"], "resultados.json", { type: "application/json" });
      fireEvent.change(screen.getByLabelText("Seleccionar archivos de resultados"), { target: { files: [file] } });
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/no se pudieron leer los archivos/i));
    } finally {
      FileReader.prototype.readAsText = originalReadAsText;
    }
  });

  it("carga el JSON seleccionado desde el formulario manual", async () => {
    render(<App />);
    const file = new File([JSON.stringify(sampleMinerScan)], "scan.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Seleccionar archivos de resultados"), { target: { files: [file] } });

    expect(await screen.findByRole("heading", { name: /resumen de seguridad/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText("scan.json")).toBeInTheDocument();
  });

  it("presenta herramientas desconocidas sin etiquetarlas como CodeQL", async () => {
    render(<App />);
    const report = {
      organization: "acme",
      findings: [{ repository: "acme/api", tool: "analyzer_sast", vulnerability_type: "rule/new", severity: "blocker", message: "Hallazgo de otro analizador" }],
      summary: { total_findings: 1, total_vulnerabilities: 0 },
    };
    const file = new File([JSON.stringify(report)], "miner-results.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Seleccionar archivos de resultados"), { target: { files: [file] } });

    const table = await screen.findByRole("table");
    expect(within(table).getByText("analyzer sast")).toBeInTheDocument();
    expect(screen.queryByText("CodeQL")).not.toBeInTheDocument();
    expect(within(table).getByText("Sin dato")).toBeInTheDocument();
  });

  it("combina las salidas CSV y JSON actuales de Analyzer", async () => {
    render(<App />);
    const files = sampleAnalyzerFiles.map((source) => new File([source.content], source.name, {
      type: source.name.endsWith(".json") ? "application/json" : "text/csv",
    }));
    fireEvent.change(screen.getByLabelText("Seleccionar archivos de resultados"), { target: { files } });

    expect(await screen.findByRole("heading", { name: /resumen de seguridad integrado/i, level: 1 })).toBeInTheDocument();
    const findingsTable = screen.getByRole("table", { name: /hallazgos de analyzer/i });
    expect(within(findingsTable).getByText("js/sql-injection")).toBeInTheDocument();
    expect(within(findingsTable).getByText("CVE-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("8 archivos de Analyzer")).toBeInTheDocument();
  });
});
