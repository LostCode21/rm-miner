import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { sampleScan } from "./data/sample";

describe("Visualizer", () => {
  it("muestra los resultados de ejemplo y permite abrir el detalle de un hallazgo", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /ver datos de ejemplo/i }));

    expect(await screen.findByRole("heading", { name: /resumen de seguridad/i })).toBeInTheDocument();
    expect(screen.getAllByText("acme-security").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CVE-2024-3094").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /py\/sql-injection/i }));
    expect(screen.getByRole("complementary", { name: /detalle del hallazgo/i })).toBeInTheDocument();
    expect(within(screen.getByRole("complementary", { name: /detalle del hallazgo/i })).getByText("src/api/users.py:87")).toBeInTheDocument();
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
    fireEvent.change(screen.getAllByLabelText("Seleccionar JSON de resultados")[0], { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/no contiene JSON válido/i));
  });

  it("carga el JSON seleccionado desde el formulario manual", async () => {
    render(<App />);
    const file = new File([JSON.stringify(sampleScan)], "scan.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Seleccionar JSON de resultados"), { target: { files: [file] } });

    expect(await screen.findByRole("heading", { name: /resumen de seguridad/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText("scan.json")).toBeInTheDocument();
  });
});
