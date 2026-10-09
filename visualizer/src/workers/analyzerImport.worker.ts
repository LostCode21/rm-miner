import { importAnalyzerFiles, type AnalyzerSourceFile } from "../adapters/analyzerOutputs";

interface WorkerScope {
  onmessage: ((event: MessageEvent<File[]>) => void) | null;
  postMessage: (message: unknown) => void;
}

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = (event) => {
  void (async () => {
    try {
      const sources = await Promise.all(event.data.map(async (file): Promise<AnalyzerSourceFile> => ({
        name: file.name,
        content: await file.text(),
      })));
      workerScope.postMessage({ data: importAnalyzerFiles(sources) });
    } catch (cause) {
      workerScope.postMessage({ error: cause instanceof Error ? cause.message : "No se pudieron procesar las salidas de Analyzer." });
    }
  })();
};
