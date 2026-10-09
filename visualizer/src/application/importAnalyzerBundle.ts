import { importAnalyzerFiles, type AnalyzerSourceFile } from "../adapters/analyzerOutputs";
import type { AnalyzerData } from "../domain/analyzer";

interface AnalyzerWorkerResponse {
  data?: AnalyzerData;
  error?: string;
}

function readLocalFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer el archivo."));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsText(file);
  });
}

async function importWithoutWorker(files: readonly File[]): Promise<AnalyzerData> {
  const sources: AnalyzerSourceFile[] = await Promise.all(files.map(async (file) => ({
    name: file.name,
    content: await readLocalFile(file),
  })));
  return importAnalyzerFiles(sources);
}

export function importAnalyzerBundle(files: readonly File[]): Promise<AnalyzerData> {
  if (typeof Worker === "undefined") return importWithoutWorker(files);

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/analyzerImport.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<AnalyzerWorkerResponse>) => {
      worker.terminate();
      if (event.data.data) resolve(event.data.data);
      else reject(new Error(event.data.error ?? "No se pudieron procesar las salidas de Analyzer."));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("No se pudieron procesar las salidas de Analyzer."));
    };
    worker.postMessage(files);
  });
}
