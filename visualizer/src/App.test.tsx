import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { sampleScan } from "./data/sample";

describe("importación local de informes Miner", () => {
  it("carga y resume un archivo JSON válido seleccionado por el usuario", async () => {
    render(<App />);
    const file = new File([JSON.stringify(sampleScan)], "scan.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Seleccionar JSON de resultados"), { target: { files: [file] } });

    expect(await screen.findByRole("heading", { name: "Resultados de acme-security" })).toBeInTheDocument();
    expect(screen.getByText(/scan\.json/)).toBeInTheDocument();
    expect(screen.getByText("py/sql-injection")).toBeInTheDocument();
  });

  it("explica cuando el archivo no contiene JSON válido", async () => {
    render(<App />);
    const file = new File(["{ roto"], "scan.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Seleccionar JSON de resultados"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/no contiene JSON válido/i));
  });

  it("muestra el dashboard con datos de demostración sin seleccionar un archivo", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /datos de ejemplo/i }));

    expect(await screen.findByRole("heading", { name: "Resultados de acme-security" })).toBeInTheDocument();
  });
});
