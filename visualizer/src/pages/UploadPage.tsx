import { AlertTriangle, ArrowDownToLine, ArrowUpRight, Check, FileJson2, ShieldCheck } from "lucide-react";
import { Brand } from "../components/Brand";

interface UploadPageProps {
  error: string;
  maxFileSizeMb: number;
  onChooseFile: () => void;
  onDropFile: (file?: File) => void;
  onLoadSample: () => void;
}

export function UploadPage({ error, maxFileSizeMb, onChooseFile, onDropFile, onLoadSample }: UploadPageProps) {
  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <Brand />
        <span className="local-note"><span className="status-pulse" /> Procesamiento local en el navegador</span>
      </header>
      <section className="welcome-grid">
        <div className="welcome-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> VISUALIZACIÓN DE SEGURIDAD</div>
          <h1>Conoce tus riesgos.<br /><span>Prioriza lo importante.</span></h1>
          <p className="welcome-description">Explora resultados consolidados de Miner y resúmenes generados por Analyzer. Tus datos permanecen en tu dispositivo: no se envían a ningún servidor.</p>
          <div className="welcome-actions">
            <button className="button button-primary button-large" onClick={onChooseFile}>
              <ArrowDownToLine size={17} /> Cargar resultados JSON
            </button>
            <button className="button button-quiet" onClick={onLoadSample}>Ver datos de ejemplo <ArrowUpRight size={15} /></button>
          </div>
          <div className="privacy-points">
            <span><Check size={14} /> Sin backend</span><span><Check size={14} /> Sin carga a la nube</span><span><Check size={14} /> Sin credenciales</span>
          </div>
        </div>
        <div className="upload-card">
          <div className="upload-card-heading"><div className="upload-icon"><FileJson2 size={20} /></div><div><strong>Importar un análisis</strong><span>JSON generado por Miner o Analyzer</span></div></div>
          <button className="drop-zone" onClick={onChooseFile} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDropFile(event.dataTransfer.files[0]); }}>
            <div className="drop-icon"><ArrowDownToLine size={21} /></div>
            <strong>Selecciona o arrastra tu archivo</strong>
            <span>Solo lectura · JSON · Máximo {maxFileSizeMb} MB</span>
            <span className="file-example"><FileJson2 size={14} /> resultados.json · repository_summary.json</span>
          </button>
          {error && <div role="alert" className="alert alert-error"><AlertTriangle size={17} />{error}</div>}
          <div className="upload-footnote"><ShieldCheck size={15} /><span>El archivo se lee localmente y se descarta al cerrar o recargar esta página.</span></div>
        </div>
      </section>
      <footer className="landing-footer"><span>Octa-Core <span className="footer-divider">/</span> Miner Visualizer</span><span>Una vista clara de tu postura de seguridad</span></footer>
    </main>
  );
}
