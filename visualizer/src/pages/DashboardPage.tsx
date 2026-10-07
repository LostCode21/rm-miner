import { AlertTriangle, Boxes, Bug, FileJson2, FolderGit2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Brand } from "../components/Brand";
import { SeverityChart, RepositoryChart, ToolChart } from "../components/Charts";
import { FindingsExplorer } from "../components/FindingsExplorer";
import { MetricCard } from "../components/MetricCard";
import { RepositoryCoverage } from "../components/RepositoryCoverage";
import type { ScanData } from "../domain/scan";

interface DashboardPageProps {
  scan: ScanData;
  error: string;
  onChooseFile: () => void;
  onClose: () => void;
}

export function DashboardPage({ scan, error, onChooseFile, onClose }: DashboardPageProps) {
  const criticalCount = scan.findings.filter((finding) => finding.severity === "critical").length;
  const highCount = scan.findings.filter((finding) => finding.severity === "high").length;
  const errorDetail = scan.summary.repositoriesWithErrors === null
    ? scan.summary.failureBreakdown.map((item) => `${item.count} ${item.label}`).join(" · ") || "Conteo no disponible"
    : `${scan.summary.unsupportedRepositories} no compatibles`;
  const vulnerabilityDetail = scan.summary.vulnerabilityBreakdown.map((item) => `${item.count} ${item.label}`).join(" · ") || "Sin vulnerabilidades reportadas";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section-label">ESPACIO DE TRABAJO</div>
        <div className="workspace-button"><div className="workspace-icon"><FolderGit2 size={17} /></div><span><strong>{scan.organization}</strong><small>Organización</small></span></div>
        <div className="sidebar-section-label sidebar-section-spaced">ANÁLISIS</div>
        <nav aria-label="Análisis">
          <a className="sidebar-nav-item active" href="#overview"><ShieldAlert size={17} /><span>Resumen de seguridad</span><span className="nav-count">{scan.summary.totalFindings}</span></a>
          <a className="sidebar-nav-item" href="#repositories-section"><FolderGit2 size={17} /><span>Repositorios</span><span className="nav-count muted-count">{scan.summary.totalRepositories}</span></a>
          <a className="sidebar-nav-item" href="#findings-section"><Bug size={17} /><span>Hallazgos</span><span className="nav-count muted-count">{scan.summary.totalFindings}</span></a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-privacy"><span className="privacy-shield"><ShieldCheck size={17} /></span><div><strong>Datos en este dispositivo</strong><small>El archivo no se transmite</small></div><span className="privacy-dot" /></div>
        <button className="sidebar-load" onClick={onChooseFile}><FileJson2 size={15} /> Cargar otro análisis</button>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Espacio de trabajo</span><span className="breadcrumb-slash">/</span><strong>Resumen de seguridad</strong></div><div className="topbar-right"><span className="loaded-file"><FileJson2 size={14} />{scan.sourceName}</span><button className="icon-button" aria-label="Cargar otro análisis" title="Cargar otro análisis" onClick={onChooseFile}><FileJson2 size={17} /></button></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><div className="eyebrow page-eyebrow"><span className="eyebrow-line" /> INFORME DE ANÁLISIS</div><h1>Resumen de seguridad</h1><p>Estado consolidado de los repositorios de <strong>{scan.organization}</strong>.</p></div><div className="scan-stamp"><span className="stamp-dot" /> Datos cargados localmente</div></div>

          {error && <div className="alert alert-error dashboard-error" role="alert"><AlertTriangle size={16} />{error}</div>}
          {scan.warnings.length > 0 && <div className="warning-stack">{scan.warnings.map((warning) => <div className="alert alert-warning" role="status" key={warning}>{warning}</div>)}</div>}

          <section id="overview" className="metrics-grid" aria-label="Métricas del análisis">
            <MetricCard icon={<FolderGit2 size={18} />} label="Repositorios" value={scan.summary.totalRepositories} detail={`${scan.summary.analyzedRepositories} analizados`} tone="blue" />
            <MetricCard icon={<ShieldAlert size={18} />} label="Hallazgos" value={scan.summary.totalFindings} detail={`${criticalCount} críticos · ${highCount} altos`} tone={criticalCount ? "red" : "teal"} />
            <MetricCard icon={<Boxes size={18} />} label="Vulnerabilidades" value={scan.summary.totalVulnerabilities} detail={vulnerabilityDetail} tone="orange" />
            <MetricCard icon={<AlertTriangle size={18} />} label="Repositorios con errores" value={scan.summary.repositoriesWithErrors} detail={errorDetail} tone="slate" />
          </section>

          <section className="overview-grid" aria-label="Visualizaciones de hallazgos">
            <SeverityChart findings={scan.findings} />
            <ToolChart findings={scan.findings} />
            <RepositoryChart findings={scan.findings} repositories={scan.repositories} />
          </section>

          <FindingsExplorer scan={scan} onClose={onClose} />
          <RepositoryCoverage repositories={scan.repositories} />
          <footer className="app-footer"><span>Octa-Core · Miner Visualizer</span><span><ShieldCheck size={14} /> El resultado se procesa localmente en tu navegador.</span></footer>
        </div>
      </main>
    </div>
  );
}
