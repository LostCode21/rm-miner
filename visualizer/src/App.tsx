import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  Bug,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  FileJson2,
  FilterX,
  FolderGit2,
  GitBranch,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { MinerDataError, parseMinerScan } from "./data/normalize";
import { sampleScan } from "./data/sample";
import type { Finding, ScanData } from "./types/miner";

type FilterState = { repository: string; tool: string; severity: string; language: string; query: string };
const initialFilters: FilterState = { repository: "all", tool: "all", severity: "all", language: "all", query: "" };

const severityOrder = ["critical", "high", "medium", "low", "info", "unknown"] as const;
const severityMeta: Record<(typeof severityOrder)[number], { label: string; color: string }> = {
  critical: { label: "Crítica", color: "var(--critical)" },
  high: { label: "Alta", color: "var(--high)" },
  medium: { label: "Media", color: "var(--medium)" },
  low: { label: "Baja", color: "var(--low)" },
  info: { label: "Info", color: "var(--info)" },
  unknown: { label: "Sin dato", color: "var(--unknown)" },
};

function readLocalFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer el archivo."));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsText(file);
  });
}

function severityKey(severity: string | null): (typeof severityOrder)[number] {
  const value = severity?.toLowerCase();
  if (!value) return "unknown";
  if (["critical", "critica", "crítica", "fatal"].includes(value)) return "critical";
  if (["high", "alta", "error"].includes(value)) return "high";
  if (["medium", "moderate", "media", "warning", "warn"].includes(value)) return "medium";
  if (["low", "baja"].includes(value)) return "low";
  if (["info", "informational", "note", "none"].includes(value)) return "info";
  if (value === "negligible") return "low";
  return "unknown";
}

function severityLabel(severity: string | null): string {
  const key = severityKey(severity);
  if (key === "info" && severity?.toLowerCase() === "note") return "Info";
  return severityMeta[key].label;
}

function prettyStatus(status: string): string {
  const statuses: Record<string, string> = {
    analyzed: "Analizado",
    clone_failed: "Error de clonación",
    unsupported: "No compatible",
    database_creation_failed: "Error CodeQL",
    analysis_failed: "Análisis fallido",
    generated: "Generado",
    empty: "Sin componentes",
    failed: "Fallido",
    skipped: "Omitido",
  };
  return statuses[status] ?? status.replaceAll("_", " ");
}

function SeverityBadge({ severity }: { severity: string | null }) {
  const key = severityKey(severity);
  return <span className={`severity-badge severity-${key}`}><i aria-hidden="true" />{severityLabel(severity)}</span>;
}

function ToolBadge({ tool }: { tool: string }) {
  return <span className={`tool-badge tool-${tool}`}><span className="tool-dot" />{tool === "grype" ? "Grype" : "CodeQL"}</span>;
}

function App() {
  const [scan, setScan] = useState<ScanData | null>(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = (data: unknown, sourceName: string) => {
    try {
      const parsed = parseMinerScan(data, sourceName);
      setScan(parsed);
      setError("");
      setFilters(initialFilters);
      setSelectedFinding(null);
    } catch (cause) {
      setScan(null);
      setError(cause instanceof MinerDataError ? cause.message : "No se pudo interpretar el archivo seleccionado.");
      setSelectedFinding(null);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      setError("Selecciona un archivo JSON de resultados de Miner.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("El archivo supera el límite de 25 MB para la carga en el navegador.");
      return;
    }
    try {
      loadData(JSON.parse(await readLocalFile(file)), file.name);
    } catch {
      setError("El archivo no contiene JSON válido. Comprueba el archivo e inténtalo de nuevo.");
    }
  };

  const loadSample = () => loadData(sampleScan, "ejemplo-miner-scan.json");

  const repositories = useMemo(() => {
    if (!scan) return [];
    return [...new Set([...scan.repositories.map((repo) => repo.fullName), ...scan.findings.map((finding) => finding.repository)])].sort();
  }, [scan]);
  const languages = useMemo(() => scan ? [...new Set(scan.findings.map((finding) => finding.language).filter((language): language is string => Boolean(language)))].sort() : [], [scan]);
  const filteredFindings = useMemo(() => {
    if (!scan) return [];
    const query = filters.query.trim().toLowerCase();
    return scan.findings.filter((finding) => {
      const matchesQuery = !query || [finding.vulnerabilityType, finding.message, finding.location, finding.packageName, finding.repository]
        .some((value) => value?.toLowerCase().includes(query));
      return (filters.repository === "all" || finding.repository === filters.repository)
        && (filters.tool === "all" || finding.tool === filters.tool)
        && (filters.severity === "all" || severityKey(finding.severity) === filters.severity)
        && (filters.language === "all" || finding.language === filters.language)
        && matchesQuery;
    });
  }, [scan, filters]);

  if (!scan) {
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
            <p className="welcome-description">Explora los hallazgos consolidados de CodeQL y Grype. Tus resultados permanecen en tu dispositivo: no se envían a ningún servidor.</p>
            <div className="welcome-actions">
              <button className="button button-primary button-large" onClick={() => inputRef.current?.click()}>
                <ArrowDownToLine size={17} /> Cargar resultados JSON
              </button>
              <button className="button button-quiet" onClick={loadSample}>Ver datos de ejemplo <ArrowUpRight size={15} /></button>
              <input ref={inputRef} className="sr-only" type="file" accept=".json,application/json" aria-label="Seleccionar JSON de resultados" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </div>
            <div className="privacy-points">
              <span><Check size={14} /> Sin backend</span><span><Check size={14} /> Sin carga a la nube</span><span><Check size={14} /> Sin credenciales</span>
            </div>
          </div>
          <div className="upload-card">
            <div className="upload-card-heading"><div className="upload-icon"><FileJson2 size={20} /></div><div><strong>Importar un análisis</strong><span>JSON generado por Miner</span></div></div>
            <button className="drop-zone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files[0]); }}>
              <div className="drop-icon"><ArrowDownToLine size={21} /></div>
              <strong>Selecciona o arrastra tu archivo</strong>
              <span>Solo lectura · JSON · Máximo 25 MB</span>
              <span className="file-example"><FileJson2 size={14} /> resultados.json</span>
            </button>
            {error && <div role="alert" className="alert alert-error"><AlertTriangle size={17} />{error}</div>}
            <div className="upload-footnote"><ShieldCheck size={15} /><span>El archivo se lee localmente y se descarta al cerrar o recargar esta página.</span></div>
          </div>
        </section>
        <footer className="landing-footer"><span>Octa-Core <span className="footer-divider">/</span> Miner Visualizer</span><span>Una vista clara de tu postura de seguridad</span></footer>
      </main>
    );
  }

  const criticalCount = scan.findings.filter((finding) => severityKey(finding.severity) === "critical").length;
  const highCount = scan.findings.filter((finding) => severityKey(finding.severity) === "high").length;
  const repositoriesWithErrors = scan.repositories.filter((repository) =>
    ["clone_failed", "database_creation_failed", "analysis_failed"].includes(repository.status)
      || repository.sbomStatus === "failed"
      || repository.grypeStatus === "failed",
  ).length;
  const selectedRepo = selectedFinding ? scan.repositories.find((repo) => repo.fullName === selectedFinding.repository) : undefined;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section-label">ESPACIO DE TRABAJO</div>
        <div className="workspace-button"><div className="workspace-icon"><FolderGit2 size={17} /></div><span><strong>{scan.organization}</strong><small>Organización</small></span><ChevronDown size={15} className="workspace-chevron" /></div>
        <div className="sidebar-section-label sidebar-section-spaced">ANÁLISIS</div>
        <nav aria-label="Análisis">
          <a className="sidebar-nav-item active" href="#overview"><ShieldAlert size={17} /><span>Resumen de seguridad</span><span className="nav-count">{scan.findings.length}</span></a>
          <a className="sidebar-nav-item" href="#repositories-section"><FolderGit2 size={17} /><span>Repositorios</span><span className="nav-count muted-count">{scan.summary.totalRepositories}</span></a>
          <a className="sidebar-nav-item" href="#findings-section"><Bug size={17} /><span>Hallazgos</span><span className="nav-count muted-count">{scan.summary.totalFindings}</span></a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-privacy"><span className="privacy-shield"><ShieldCheck size={17} /></span><div><strong>Datos en este dispositivo</strong><small>El archivo no se transmite</small></div><span className="privacy-dot" /></div>
        <button className="sidebar-load" onClick={() => inputRef.current?.click()}><ArrowDownToLine size={15} /> Cargar otro análisis</button>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Espacio de trabajo</span><span className="breadcrumb-slash">/</span><strong>Resumen de seguridad</strong></div><div className="topbar-right"><span className="loaded-file"><FileJson2 size={14} />{scan.sourceName}</span><button className="icon-button" aria-label="Cargar otro análisis" title="Cargar otro análisis" onClick={() => inputRef.current?.click()}><ArrowDownToLine size={17} /></button><input ref={inputRef} className="sr-only" type="file" accept=".json,application/json" aria-label="Seleccionar JSON de resultados" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><div className="eyebrow page-eyebrow"><span className="eyebrow-line" /> INFORME DE ANÁLISIS</div><h1>Resumen de seguridad</h1><p>Estado consolidado de los repositorios de <strong>{scan.organization}</strong>.</p></div><div className="scan-stamp"><span className="stamp-dot" /> Datos cargados localmente</div></div>

          {error && <div className="alert alert-error dashboard-error" role="alert"><AlertTriangle size={16} />{error}</div>}
          {scan.warnings.length > 0 && <div className="warning-stack">{scan.warnings.map((warning) => <div className="alert alert-warning" role="status" key={warning}><CircleHelp size={16} />{warning}</div>)}</div>}

          <section id="overview" className="metrics-grid" aria-label="Métricas del análisis">
            <MetricCard icon={<FolderGit2 size={18} />} label="Repositorios" value={scan.summary.totalRepositories} detail={`${scan.summary.analyzedRepositories} analizados`} tone="blue" />
            <MetricCard icon={<ShieldAlert size={18} />} label="Hallazgos" value={scan.findings.length} detail={`${criticalCount} críticos · ${highCount} altos`} tone={criticalCount ? "red" : "teal"} />
            <MetricCard icon={<Boxes size={18} />} label="Vulnerabilidades" value={scan.summary.totalVulnerabilities} detail={`${scan.findings.filter((finding) => finding.tool === "grype").length} registros Grype`} tone="orange" />
            <MetricCard icon={<AlertTriangle size={18} />} label="Repositorios con errores" value={repositoriesWithErrors} detail={`${scan.summary.unsupportedRepositories} no compatibles`} tone="slate" />
          </section>

          <section className="overview-grid" aria-label="Visualizaciones de hallazgos">
            <SeverityChart findings={scan.findings} />
            <ToolChart findings={scan.findings} />
            <RepositoryChart findings={scan.findings} repositories={scan.repositories} />
          </section>

          <section id="findings-section" className="findings-section" aria-labelledby="findings-title">
            <div className="section-heading"><div><div className="section-kicker">EXPLORADOR</div><h2 id="findings-title">Hallazgos detectados <span className="heading-count">{filteredFindings.length}</span></h2><p>Filtra y revisa los resultados de CodeQL y Grype.</p></div><button className="button button-outline" onClick={() => { setScan(null); setFilters(initialFilters); setSelectedFinding(null); setError(""); }}><X size={15} /> Cerrar análisis</button></div>
            <div className="filter-bar">
              <label className="search-field"><Search size={16} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Buscar hallazgo, paquete o ruta..." aria-label="Buscar hallazgo, paquete o ruta" /></label>
              <FilterSelect label="Repositorio" value={filters.repository} options={repositories} onChange={(value) => setFilters({ ...filters, repository: value })} />
              <FilterSelect label="Herramienta" value={filters.tool} options={["codeql", "grype"]} display={(value) => value === "all" ? "Todas las herramientas" : value === "codeql" ? "CodeQL" : "Grype"} onChange={(value) => setFilters({ ...filters, tool: value })} />
              <FilterSelect label="Severidad" value={filters.severity} options={severityOrder} display={(value) => value === "all" ? "Todas las severidades" : severityMeta[value as keyof typeof severityMeta].label} onChange={(value) => setFilters({ ...filters, severity: value })} />
              <FilterSelect label="Lenguaje" value={filters.language} options={languages} onChange={(value) => setFilters({ ...filters, language: value })} />
              {Object.values(filters).some((value) => value !== "all" && value !== "") && <button className="reset-filters" onClick={() => setFilters(initialFilters)}><FilterX size={15} /> Limpiar</button>}
            </div>
            <div className={`results-layout ${selectedFinding ? "has-selection" : ""}`}>
              <div className="table-card">
                {filteredFindings.length === 0 ? <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><strong>No hay hallazgos para mostrar</strong><span>Prueba con otros filtros o términos de búsqueda.</span></div> : <div className="table-scroll"><table><thead><tr><th>HALLAZGO</th><th>REPOSITORIO</th><th>HERRAMIENTA</th><th>SEVERIDAD</th><th>UBICACIÓN</th></tr></thead><tbody>{filteredFindings.map((finding) => <tr key={finding.id} className={selectedFinding?.id === finding.id ? "selected-row" : ""}><td><button className="finding-name" onClick={() => setSelectedFinding(finding)}><strong>{finding.vulnerabilityType}</strong><span>{finding.message || "Sin descripción disponible"}</span></button></td><td><span className="repository-cell"><GitBranch size={13} />{finding.repository.split("/").at(-1)}</span></td><td><ToolBadge tool={finding.tool} /></td><td><SeverityBadge severity={finding.severity} /></td><td><span className="location-cell">{finding.location ? `${finding.location}${finding.line ? `:${finding.line}` : ""}` : finding.packageName ?? "—"}</span></td></tr>)}</tbody></table></div>}
                <div className="table-footer"><span>Mostrando <strong>{filteredFindings.length}</strong> de {scan.findings.length} hallazgos</span><span>Resultados de {scan.sourceName}</span></div>
              </div>
              {selectedFinding && <FindingDetail finding={selectedFinding} repository={selectedRepo} onClose={() => setSelectedFinding(null)} />}
            </div>
          </section>

          <section id="repositories-section" className="repositories-section" aria-labelledby="repositories-title"><div className="section-heading compact-heading"><div><div className="section-kicker">COBERTURA</div><h2 id="repositories-title">Repositorios analizados <span className="heading-count">{scan.repositories.length}</span></h2></div></div><div className="repo-grid">{scan.repositories.map((repository) => <article className="repo-card" key={repository.fullName}><div className="repo-card-top"><div className="repo-icon"><Code2 size={16} /></div><StatusBadge status={repository.status} /></div><h3>{repository.name}</h3><p className="repo-fullname">{repository.fullName}</p><div className="repo-languages">{repository.languages.length ? repository.languages.slice(0, 3).map((language) => <span key={language}>{language}</span>) : <span>Lenguaje no detectado</span>}</div>{repository.error && <p className="repo-error"><AlertTriangle size={13} />{repository.error}</p>}<div className="repo-card-bottom"><span>SBOM <strong>{repository.sbomStatus ? prettyStatus(repository.sbomStatus) : "—"}</strong></span><span>Grype <strong>{repository.grypeStatus ? prettyStatus(repository.grypeStatus) : "—"}</strong></span></div></article>)}</div></section>
          <footer className="app-footer"><span>Octa-Core · Miner Visualizer</span><span><ShieldCheck size={14} /> El resultado se procesa localmente en tu navegador.</span></footer>
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><ShieldCheck size={19} strokeWidth={2.2} /></span><span className="brand-name">octa-core<span>.</span></span><span className="brand-subtitle">MINER VISUALIZER</span></div>;
}

function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: number; detail: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon metric-${tone}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value.toLocaleString("es-ES")}</div><div className="metric-detail">{detail}</div></article>;
}

function SeverityChart({ findings }: { findings: Finding[] }) {
  const counts = severityOrder.map((key) => ({ key, count: findings.filter((finding) => severityKey(finding.severity) === key).length }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return <article className="chart-card severity-chart"><ChartHeading eyebrow="SEVERIDAD" title="Hallazgos por severidad" total={findings.length} /><div className="severity-bars">{counts.map(({ key, count }) => <div className="severity-row" key={key}><span className="severity-row-label"><i style={{ background: severityMeta[key].color }} />{severityMeta[key].label}</span><div className="bar-track"><span className="bar-fill" style={{ width: `${(count / max) * 100}%`, background: severityMeta[key].color, minWidth: count ? "5px" : "0" }} /></div><strong>{count}</strong></div>)}</div></article>;
}

function ToolChart({ findings }: { findings: Finding[] }) {
  const codeql = findings.filter((finding) => finding.tool === "codeql").length;
  const grype = findings.filter((finding) => finding.tool === "grype").length;
  const total = Math.max(1, findings.length);
  return <article className="chart-card tool-chart"><ChartHeading eyebrow="ORIGEN" title="Hallazgos por herramienta" total={findings.length} /><div className="tool-visual"><div className="donut" style={{ "--codeql-share": `${(codeql / total) * 100}%` } as React.CSSProperties}><div className="donut-inner"><strong>{findings.length}</strong><span>hallazgos</span></div></div><div className="tool-legend"><div><span className="legend-swatch codeql-swatch" /><span>CodeQL</span><strong>{codeql}</strong></div><div><span className="legend-swatch grype-swatch" /><span>Grype</span><strong>{grype}</strong></div></div></div></article>;
}

function RepositoryChart({ findings, repositories }: { findings: Finding[]; repositories: ScanData["repositories"] }) {
  const counts = repositories.map((repository) => ({ name: repository.name, count: findings.filter((finding) => finding.repository === repository.fullName).length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  const max = Math.max(1, ...counts.map((item) => item.count));
  return <article className="chart-card repo-chart"><ChartHeading eyebrow="DISTRIBUCIÓN" title="Hallazgos por repositorio" total={findings.length} /><div className="repo-bars">{counts.length ? counts.map((item) => <div className="repo-bar-row" key={item.name}><span title={item.name}>{item.name}</span><div className="bar-track"><span className="bar-fill repo-fill" style={{ width: `${(item.count / max) * 100}%`, minWidth: item.count ? "5px" : "0" }} /></div><strong>{item.count}</strong></div>) : <div className="chart-empty">Sin repositorios en el resultado.</div>}</div></article>;
}

function ChartHeading({ eyebrow, title, total }: { eyebrow: string; title: string; total: number }) {
  return <div className="chart-heading"><div><span className="chart-eyebrow">{eyebrow}</span><h3>{title}</h3></div><span className="chart-total">{total}</span></div>;
}

function FilterSelect({ label, value, options, display, onChange }: { label: string; value: string; options: readonly string[]; display?: (value: string) => string; onChange: (value: string) => void }) {
  return <label className="filter-select"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}><option value="all">{label === "Herramienta" ? "Todas las herramientas" : label === "Severidad" ? "Todas las severidades" : `Todos: ${label.toLowerCase()}`}</option>{options.map((option) => <option value={option} key={option}>{display ? display(option) : option}</option>)}</select><ChevronDown size={14} /></label>;
}

function FindingDetail({ finding, repository, onClose }: { finding: Finding; repository?: ScanData["repositories"][number]; onClose: () => void }) {
  return <aside className="detail-panel" aria-label="Detalle del hallazgo"><div className="detail-header"><div><span className="section-kicker">DETALLE DEL HALLAZGO</span><button className="detail-close" aria-label="Cerrar detalle" onClick={onClose}><X size={17} /></button></div><h3>{finding.vulnerabilityType}</h3><div className="detail-badges"><SeverityBadge severity={finding.severity} /><ToolBadge tool={finding.tool} /></div></div><div className="detail-body"><DetailField label="Repositorio" value={finding.repository} /><DetailField label="Descripción" value={finding.message || "No hay descripción disponible."} /><DetailField label="Ubicación" value={finding.location ? `${finding.location}${finding.line ? `:${finding.line}` : ""}` : null} /><DetailField label="Lenguaje" value={finding.language} /><DetailField label="Paquete afectado" value={finding.packageName} /><DetailField label="Versión instalada" value={finding.version} /><DetailField label="Versión corregida" value={finding.fixedVersion} /><DetailField label="Tipo de artefacto" value={finding.artifactType} />{repository?.error && <DetailField label="Error del repositorio" value={repository.error} />}</div><div className="detail-note"><ShieldCheck size={15} /> Revisa el contexto en el repositorio antes de priorizar la remediación.</div></aside>;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="detail-field"><span>{label}</span><strong>{value || "No disponible"}</strong></div>;
}

function StatusBadge({ status }: { status: string }) {
  const type = status === "analyzed" ? "ok" : status === "unsupported" || status === "unknown" ? "neutral" : "error";
  return <span className={`status-badge status-${type}`}><i />{prettyStatus(status)}</span>;
}

export default App;
