import { useRef, useState } from "react";
import { importAnalyzerFiles } from "./adapters/analyzerOutputs";
import { importScanResult, UnsupportedScanFormatError } from "./application/importScan";
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

  const showAnalysis = (data: VisualizationData) => {
    setAnalysis(data);
    setScanRevision((revision) => revision + 1);
    setError("");
  };

  const loadData = (data: unknown, sourceName: string) => {
    try {
      showAnalysis(importScanResult(data, sourceName));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo interpretar el archivo seleccionado.");
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    if (files.some((file) => !/\.(json|csv)$/i.test(file.name))) {
      setError("Selecciona únicamente archivos JSON o CSV de resultados.");
      return;
    }
    const totalSize = files.reduce((total, file) => total + file.size, 0);
    if (totalSize > MAX_SCAN_FILE_SIZE_BYTES) {
      setError(`Los archivos superan el límite conjunto de ${MAX_SCAN_FILE_SIZE_MB} MB para la carga en el navegador.`);
      return;
    }
    let sources: { name: string; content: string }[];
    try {
      sources = await Promise.all(files.map(async (file) => ({ name: file.name, content: await readLocalFile(file) })));
    } catch {
      setError("No se pudieron leer los archivos seleccionados. Comprueba que sigan disponibles e inténtalo de nuevo.");
      return;
    }

    try {
      if (sources.length === 1 && sources[0].name.toLowerCase().endsWith(".json")) {
        let document: unknown;
        try {
          document = JSON.parse(sources[0].content);
        } catch {
          throw new Error("El archivo no contiene JSON válido. Comprueba el archivo e inténtalo de nuevo.");
        }
        try {
          showAnalysis(importScanResult(document, sources[0].name));
          return;
        } catch (cause) {
          if (!(cause instanceof UnsupportedScanFormatError)) throw cause;
        }
      }
      showAnalysis(importAnalyzerFiles(sources));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron interpretar los archivos seleccionados.");
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".json,.csv,application/json,text/csv"
        multiple
        aria-label="Seleccionar archivos de resultados"
        onChange={(event) => { void handleFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }}
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
          onDropFiles={(files) => { void handleFiles(files); }}
          onLoadSample={() => loadData(sampleMinerScan, "ejemplo-miner-scan.json")}
        />
      )}
    </>
  );
}

export default App;
