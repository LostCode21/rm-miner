import { useRef, useState } from "react";
import { importScanResult } from "./application/importScan";
import { sampleMinerScan } from "./adapters/minerScan.sample";
import { isAnalyzerData, type VisualizationData } from "./domain/analyzer";
import { AnalyzerDashboardPage } from "./pages/AnalyzerDashboardPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UploadPage } from "./pages/UploadPage";

const MAX_SCAN_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_SCAN_FILE_SIZE_MB = MAX_SCAN_FILE_SIZE_BYTES / (1024 * 1024);

function readLocalFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer el archivo."));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsText(file);
  });
}

function App() {
  const [analysis, setAnalysis] = useState<VisualizationData | null>(null);
  const [scanRevision, setScanRevision] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = (data: unknown, sourceName: string) => {
    try {
      setAnalysis(importScanResult(data, sourceName));
      setScanRevision((revision) => revision + 1);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo interpretar el archivo seleccionado.");
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      setError("Selecciona un archivo JSON de resultados.");
      return;
    }
    if (file.size > MAX_SCAN_FILE_SIZE_BYTES) {
      setError(`El archivo supera el límite de ${MAX_SCAN_FILE_SIZE_MB} MB para la carga en el navegador.`);
      return;
    }
    let contents: string;
    try {
      contents = await readLocalFile(file);
    } catch {
      setError("No se pudo leer el archivo seleccionado. Comprueba que siga disponible e inténtalo de nuevo.");
      return;
    }
    let data: unknown;
    try {
      data = JSON.parse(contents);
    } catch {
      setError("El archivo no contiene JSON válido. Comprueba el archivo e inténtalo de nuevo.");
      return;
    }
    loadData(data, file.name);
  };

  return (
    <>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".json,application/json"
        aria-label="Seleccionar JSON de resultados"
        onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }}
      />
      {analysis ? (
        isAnalyzerData(analysis)
          ? <AnalyzerDashboardPage key={scanRevision} data={analysis} error={error} onChooseFile={() => inputRef.current?.click()} onClose={() => { setAnalysis(null); setError(""); }} />
          : <DashboardPage key={scanRevision} scan={analysis} error={error} onChooseFile={() => inputRef.current?.click()} onClose={() => { setAnalysis(null); setError(""); }} />
      ) : (
        <UploadPage
          error={error}
          maxFileSizeMb={MAX_SCAN_FILE_SIZE_MB}
          onChooseFile={() => inputRef.current?.click()}
          onDropFile={(file) => { void handleFile(file); }}
          onLoadSample={() => loadData(sampleMinerScan, "ejemplo-miner-scan.json")}
        />
      )}
    </>
  );
}

export default App;
