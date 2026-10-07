import { useRef, useState } from "react";
import { FileJson2, ShieldCheck, Upload } from "lucide-react";
import { MinerDataError, parseMinerScan } from "./data/normalize";
import { sampleScan } from "./data/sample";
import type { ScanData } from "./types/miner";

function App() {
  const [scan, setScan] = useState<ScanData | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = (input: unknown, sourceName: string) => {
    try {
      setScan(parseMinerScan(input, sourceName));
      setError("");
    } catch (cause) {
      setScan(null);
      setError(cause instanceof MinerDataError ? cause.message : "El archivo no contiene JSON válido.");
    }
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      setError("Selecciona un archivo JSON de resultados de Miner.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("El archivo supera el límite de 25 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadData(JSON.parse(String(reader.result)), file.name);
      } catch {
        setScan(null);
        setError("El archivo no contiene JSON válido. Comprueba el archivo e inténtalo de nuevo.");
      }
    };
    reader.onerror = () => setError("No se pudo leer el archivo seleccionado.");
    reader.readAsText(file);
  };

  return (
    <main className="import-shell">
      <header className="import-header"><ShieldCheck size={20} /><strong>octa-core</strong><span>Miner Visualizer</span></header>
      {!scan ? (
        <section className="import-card">
          <FileJson2 size={30} />
          <h1>Carga un análisis de Miner</h1>
          <p>Selecciona el JSON generado por <code>miner scan</code>. El archivo se procesa localmente en el navegador.</p>
          <button className="import-button" onClick={() => inputRef.current?.click()}><Upload size={16} />Seleccionar JSON</button>
          <button className="sample-button" onClick={() => loadData(sampleScan, "ejemplo-miner-scan.json")}>Probar con datos de ejemplo</button>
          {error && <div role="alert" className="import-error">{error}</div>}
          <input ref={inputRef} className="sr-only" type="file" accept=".json,application/json" aria-label="Seleccionar JSON de resultados" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <small>Sin backend · Sin carga a la nube · Máximo 25 MB</small>
        </section>
      ) : (
        <section className="import-result">
          <div className="result-heading"><div><small>ARCHIVO LOCAL · {scan.sourceName}</small><h1>Resultados de {scan.organization}</h1></div><button className="import-button" onClick={() => inputRef.current?.click()}><Upload size={15} />Cargar otro</button></div>
          <div className="result-metrics"><span>Repositorios<strong>{scan.summary.totalRepositories}</strong></span><span>Hallazgos<strong>{scan.findings.length}</strong></span><span>Vulnerabilidades Grype<strong>{scan.summary.totalVulnerabilities}</strong></span><span>Repositorios con errores<strong>{scan.summary.failedRepositories}</strong></span></div>
          {scan.warnings.map((warning) => <p className="import-warning" role="status" key={warning}>{warning}</p>)}
          <h2>Hallazgos</h2>
          {scan.findings.length ? <ul>{scan.findings.map((finding) => <li key={finding.id}><strong>{finding.vulnerabilityType}</strong><span>{finding.repository} · {finding.tool} · {finding.severity ?? "Sin severidad"}</span><p>{finding.message || finding.location || finding.packageName || "Sin detalle adicional"}</p></li>)}</ul> : <p>No se encontraron hallazgos en este resultado.</p>}
          <input ref={inputRef} className="sr-only" type="file" accept=".json,application/json" aria-label="Seleccionar JSON de resultados" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </section>
      )}
    </main>
  );
}

export default App;
