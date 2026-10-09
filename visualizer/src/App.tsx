import { useRef, useState } from "react";
import { importAnalyzerFiles } from "./adapters/analyzerOutputs";
import { sampleAnalyzerFiles } from "./adapters/analyzerOutputs.sample";
import { importAnalyzerBundle } from "./application/importAnalyzerBundle";
import type { AnalyzerData } from "./domain/analyzer";
import { AnalyzerDashboardPage } from "./pages/AnalyzerDashboardPage";
import { UploadPage } from "./pages/UploadPage";

const MAX_ANALYZER_BUNDLE_SIZE_BYTES = 64 * 1024 * 1024;
const MAX_ANALYZER_BUNDLE_SIZE_MB = MAX_ANALYZER_BUNDLE_SIZE_BYTES / (1024 * 1024);

function App() {
  const [analysis, setAnalysis] = useState<AnalyzerData | null>(null);
  const [scanRevision, setScanRevision] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const showAnalysis = (data: AnalyzerData) => {
    setAnalysis(data);
    setScanRevision((revision) => revision + 1);
    setError("");
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    if (files.some((file) => !/\.(json|csv)$/i.test(file.name))) {
      setError("La carpeta de Analyzer debe contener únicamente salidas CSV o JSON.");
      return;
    }
    const totalSize = files.reduce((total, file) => total + file.size, 0);
    if (totalSize > MAX_ANALYZER_BUNDLE_SIZE_BYTES) {
      setError(`Los archivos superan el límite conjunto de ${MAX_ANALYZER_BUNDLE_SIZE_MB} MB para la carga en el navegador.`);
      return;
    }
    try {
      showAnalysis(await importAnalyzerBundle(files));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron interpretar las salidas de Analyzer.");
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
        aria-label="Seleccionar carpeta de Analyzer"
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(event) => { void handleFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }}
      />
      {analysis ? (
        <AnalyzerDashboardPage key={scanRevision} data={analysis} error={error} onChooseFile={() => inputRef.current?.click()} onClose={() => { setAnalysis(null); setError(""); }} />
      ) : (
        <UploadPage
          error={error}
          maxFileSizeMb={MAX_ANALYZER_BUNDLE_SIZE_MB}
          onChooseFile={() => inputRef.current?.click()}
          onDropFiles={(files) => { void handleFiles(files); }}
          onLoadSample={() => showAnalysis(importAnalyzerFiles(sampleAnalyzerFiles))}
        />
      )}
    </>
  );
}

export default App;
