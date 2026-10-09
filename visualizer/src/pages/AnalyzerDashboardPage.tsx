import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Bug,
  FileJson2,
  FolderGit2,
  PackageSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { SeverityBadge, ToolBadge } from "../components/Badges";
import { SeverityChart, ToolChart } from "../components/Charts";
import { MetricCard } from "../components/MetricCard";
import type { AnalyzerData, AnalyzerFinding } from "../domain/analyzer";
import { deriveAnalyzerInsights } from "../domain/analyzerInsights";
import type { SeverityCategory } from "../domain/scan";
import { severityCategories, severityLabels } from "../domain/severity";

interface AnalyzerDashboardPageProps {
  data: AnalyzerData;
  error: string;
  onChooseFile: () => void;
  onClose: () => void;
}

const PAGE_SIZE = 100;

export function AnalyzerDashboardPage({ data, error, onChooseFile, onClose }: AnalyzerDashboardPageProps) {
  const codeqlCount = data.findings.filter((finding) => finding.tool === "codeql").length;
  const grypeCount = data.findings.filter((finding) => finding.tool === "grype").length;
  const repositoryCount = data.repositories.length || new Set(data.findings.map((finding) => finding.repository)).size;
  const insights = useMemo(() => deriveAnalyzerInsights(data), [data]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section-label">FUENTE</div>
        <div className="workspace-button"><div className="workspace-icon"><FolderGit2 size={17} /></div><span><strong>{data.organization}</strong><small>Analyzer · {data.sourceNames.length} archivos</small></span></div>
        <div className="sidebar-section-label sidebar-section-spaced">ANÁLISIS</div>
        <nav aria-label="Análisis de Analyzer">
          <a className="sidebar-nav-item active" href="#overview"><ShieldAlert size={17} /><span>Resumen</span><span className="nav-count">{data.findings.length}</span></a>
          <a className="sidebar-nav-item" href="#findings-section"><Bug size={17} /><span>Hallazgos</span><span className="nav-count muted-count">{data.findings.length}</span></a>
          <a className="sidebar-nav-item" href="#repositories-section"><PackageSearch size={17} /><span>Repositorios</span><span className="nav-count muted-count">{repositoryCount}</span></a>
          {data.sbom && <a className="sidebar-nav-item" href="#sbom-section"><Boxes size={17} /><span>Composición SBOM</span><span className="nav-count muted-count">{data.sbom.sbomCount}</span></a>}
          <a className="sidebar-nav-item" href="#conclusions-section"><ShieldCheck size={17} /><span>Conclusiones</span></a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-privacy"><span className="privacy-shield"><ShieldCheck size={17} /></span><div><strong>Datos en este dispositivo</strong><small>Los archivos no se transmiten</small></div><span className="privacy-dot" /></div>
        <button className="sidebar-load" onClick={onChooseFile}><FileJson2 size={15} /> Cargar otro análisis</button>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Analyzer</span><span className="breadcrumb-slash">/</span><strong>Resultados integrados</strong></div><div className="topbar-right"><span className="loaded-file"><FileJson2 size={14} />{data.sourceName}</span><button className="icon-button" aria-label="Cargar otro análisis" title="Cargar otro análisis" onClick={onChooseFile}><FileJson2 size={17} /></button></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><div className="eyebrow page-eyebrow"><span className="eyebrow-line" /> RESULTADOS DE ANALYZER</div><h1>Resumen de seguridad integrado</h1><p>CodeQL, Grype y agregados calculados para <strong>{data.organization}</strong>.</p></div><div className="scan-stamp"><span className="stamp-dot" /> {data.sourceNames.length} archivos combinados localmente</div></div>

          {error && <div className="alert alert-error dashboard-error" role="alert"><AlertTriangle size={16} />{error}</div>}
          {data.warnings.length > 0 && <div className="warning-stack">{data.warnings.map((warning) => <div className="alert alert-warning" role="status" key={warning}>{warning}</div>)}</div>}

          <section id="overview" className="metrics-grid" aria-label="Métricas de Analyzer">
            <MetricCard icon={<FolderGit2 size={18} />} label="Repositorios con evidencia" value={repositoryCount} detail="Presentes en las salidas de Analyzer" tone="blue" />
            <MetricCard icon={<ShieldAlert size={18} />} label="Evidencias" value={data.findings.length} detail="Consolidado sin duplicar archivos" tone="teal" />
            <MetricCard icon={<Wrench size={18} />} label="CodeQL" value={codeqlCount} detail="Hallazgos de análisis estático" tone="slate" />
            <MetricCard icon={<Bug size={18} />} label="Grype" value={grypeCount} detail="Detecciones de dependencias" tone="orange" />
          </section>

          <section className="overview-grid" aria-label="Visualizaciones de Analyzer">
            <SeverityChart findings={data.findings} />
            <ToolChart findings={data.findings} />
            <RepositoryEvidenceChart data={data} />
          </section>

          <AnalyzerInsightsSection insights={insights} />
          <SbomAnalysis data={data} />
          <AnalyzerFindings data={data} onClose={onClose} />
          <RepositoryAnalysis data={data} />

          <footer className="app-footer"><span>Octa-Core · Miner Visualizer</span><span><ShieldCheck size={14} /> Los resultados se procesan localmente en tu navegador.</span></footer>
        </div>
      </main>
    </div>
  );
}

function AnalyzerInsightsSection({ insights }: { insights: ReturnType<typeof deriveAnalyzerInsights> }) {
  return (
    <section id="conclusions-section" className="findings-section" aria-labelledby="conclusions-title">
      <div className="section-heading compact-heading"><div><div className="section-kicker">LECTURA EJECUTIVA</div><h2 id="conclusions-title">Conclusiones del análisis</h2><p>Observaciones y criterios metodológicos calculados localmente desde las salidas de Analyzer.</p></div></div>
      <div className="overview-grid insights-grid">
        <InsightCard eyebrow="SEGURIDAD" title="Principales observaciones" items={insights.securityObservations} />
        <InsightCard eyebrow="COMPOSICIÓN" title="Principales resultados SBOM" items={insights.sbomResults} empty="No se cargaron resultados SBOM." />
        <InsightCard eyebrow="METODOLOGÍA" title="Conclusión metodológica" items={insights.methodology} />
      </div>
    </section>
  );
}

function InsightCard({ eyebrow, title, items, empty = "Sin observaciones disponibles." }: { eyebrow: string; title: string; items: string[]; empty?: string }) {
  return (
    <article className="chart-card insight-card">
      <div className="chart-heading"><div><span className="chart-eyebrow">{eyebrow}</span><h3>{title}</h3></div><span className="chart-total">{items.length}</span></div>
      {items.length ? <ul className="insight-list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <div className="chart-empty insight-empty">{empty}</div>}
    </article>
  );
}

function SbomAnalysis({ data }: { data: AnalyzerData }) {
  const sbom = data.sbom;
  if (!sbom) return null;
  const repositoryBars = sbom.repositories.slice(0, 5).map((item) => ({ name: item.repository, value: item.uniqueComponents }));
  const packageBars = sbom.sharedPackages.slice(0, 5).map((item) => ({ name: item.name, value: item.repositories }));
  const diversityBars = sbom.versionDiversity.slice(0, 5).map((item) => ({ name: item.name, value: item.distinctVersions }));
  return (
    <section id="sbom-section" className="findings-section" aria-labelledby="sbom-title">
      <div className="section-heading compact-heading"><div><div className="section-kicker">COMPOSICIÓN DE SOFTWARE</div><h2 id="sbom-title">Resumen de resultados SBOM <span className="heading-count">{sbom.sbomCount}</span></h2><p>Agregados generados por Analyzer a partir del inventario de Syft.</p></div></div>
      <div className="metrics-grid">
        <MetricCard icon={<Boxes size={18} />} label="Componentes únicos" value={sbom.uniqueComponents} detail={`${sbom.rawComponentOccurrences.toLocaleString("es-ES")} apariciones antes de deduplicar`} tone="blue" />
        <MetricCard icon={<PackageSearch size={18} />} label="Paquetes compartidos" value={sbom.sharedPackages.length} detail="Paquetes npm presentes en uno o más repositorios" tone="teal" />
        <MetricCard icon={<Wrench size={18} />} label="Relaciones" value={sbom.dependencyEdges} detail="Aristas de dependencia exportadas por Analyzer" tone="slate" />
        <MetricCard icon={<AlertTriangle size={18} />} label="Versiones desconocidas" value={sbom.unknownVersions} detail={`${sbom.emptySboms} SBOM vacíos`} tone="orange" />
      </div>
      <div className="overview-grid">
        <CompactBarChart eyebrow="COMPONENTES" title="Repositorios con más componentes" items={repositoryBars} />
        <CompactBarChart eyebrow="REUTILIZACIÓN" title="Paquetes más compartidos" items={packageBars} />
        <CompactBarChart eyebrow="VERSIONES" title="Mayor diversidad de versiones" items={diversityBars} />
      </div>
      <div className="table-card standalone-table-card sbom-table-card">
        <div className="table-scroll"><table aria-label="Resumen SBOM por repositorio"><thead><tr><th>REPOSITORIO</th><th>COMPONENTES</th><th>NPM</th><th>ACCIONES</th><th>SIN VERSIÓN</th><th>PURL</th><th>CPE</th><th>LICENCIAS</th><th>RELACIONES</th></tr></thead><tbody>{sbom.repositories.map((item) => <tr key={item.repository}><td>{item.repository}</td><td>{item.uniqueComponents.toLocaleString("es-ES")}</td><td>{item.npmComponents.toLocaleString("es-ES")}</td><td>{item.githubActionComponents.toLocaleString("es-ES")}</td><td>{item.unknownVersions.toLocaleString("es-ES")}</td><td>{item.purlPercentage.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%</td><td>{item.cpePercentage.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%</td><td>{item.licensePercentage.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%</td><td>{item.dependencyEdges.toLocaleString("es-ES")}</td></tr>)}</tbody></table></div>
        <div className="table-footer"><span><strong>{sbom.repositories.length}</strong> repositorios inventariados</span><span>PURL {sbom.purlPercentage.toLocaleString("es-ES", { maximumFractionDigits: 2 })}% · CPE {sbom.cpePercentage.toLocaleString("es-ES", { maximumFractionDigits: 2 })}% · Licencias {sbom.licensePercentage.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%</span></div>
      </div>
    </section>
  );
}

function CompactBarChart({ eyebrow, title, items }: { eyebrow: string; title: string; items: { name: string; value: number }[] }) {
  const maximum = Math.max(1, ...items.map((item) => item.value));
  return <article className="chart-card repo-chart"><div className="chart-heading"><div><span className="chart-eyebrow">{eyebrow}</span><h3>{title}</h3></div><span className="chart-total">{items.length}</span></div><div className="repo-bars">{items.length ? items.map((item) => <div className="repo-bar-row" key={item.name}><span title={item.name}>{item.name}</span><div className="bar-track"><span className="bar-fill repo-fill" style={{ width: `${item.value / maximum * 100}%` }} /></div><strong>{item.value.toLocaleString("es-ES")}</strong></div>) : <div className="chart-empty">Sin datos disponibles.</div>}</div></article>;
}

function RepositoryEvidenceChart({ data }: { data: AnalyzerData }) {
  const repositories = [...data.repositories]
    .sort((left, right) => right.totalSecurityEvidence - left.totalSecurityEvidence || left.repository.localeCompare(right.repository))
    .slice(0, 5);
  const maximum = Math.max(1, ...repositories.map((item) => item.totalSecurityEvidence));
  const total = data.repositories.reduce((sum, item) => sum + item.totalSecurityEvidence, 0);
  return (
    <article className="chart-card repo-chart">
      <div className="chart-heading"><div><span className="chart-eyebrow">DISTRIBUCIÓN</span><h3>Mayor evidencia por repositorio</h3></div><span className="chart-total">{total.toLocaleString("es-ES")}</span></div>
      <div className="repo-bars">{repositories.length ? repositories.map((item) => <div className="repo-bar-row" key={item.repository}><span title={item.repository}>{item.repository.split("/").at(-1)}</span><div className="bar-track"><span className="bar-fill repo-fill" style={{ width: `${(item.totalSecurityEvidence / maximum) * 100}%` }} /></div><strong>{item.totalSecurityEvidence.toLocaleString("es-ES")}</strong></div>) : <div className="chart-empty">Sin resumen por repositorio.</div>}</div>
    </article>
  );
}

interface FindingFilters {
  query: string;
  repository: string;
  tool: string;
  severity: string;
}

const initialFilters: FindingFilters = { query: "", repository: "all", tool: "all", severity: "all" };

function AnalyzerFindings({ data, onClose }: { data: AnalyzerData; onClose: () => void }) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const repositories = useMemo(() => [...new Set(data.findings.map((finding) => finding.repository))].sort(), [data.findings]);
  const tools = useMemo(() => [...new Set(data.findings.map((finding) => finding.tool))].sort(), [data.findings]);
  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return data.findings.filter((finding) => {
      const matchesQuery = !query || [finding.vulnerabilityType, finding.message, finding.location, finding.packageName, finding.repository]
        .some((value) => value?.toLowerCase().includes(query));
      return matchesQuery
        && (filters.repository === "all" || finding.repository === filters.repository)
        && (filters.tool === "all" || finding.tool === filters.tool)
        && (filters.severity === "all" || finding.severity === filters.severity);
    });
  }, [data.findings, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const firstVisible = filtered.length ? currentPage * PAGE_SIZE + 1 : 0;
  const lastVisible = Math.min((currentPage + 1) * PAGE_SIZE, filtered.length);
  const updateFilters = (next: FindingFilters) => { setFilters(next); setPage(0); };

  return (
    <section id="findings-section" className="findings-section" aria-labelledby="analyzer-findings-title">
      <div className="section-heading"><div><div className="section-kicker">EVIDENCIAS CONSOLIDADAS</div><h2 id="analyzer-findings-title">Hallazgos de Analyzer <span className="heading-count">{filtered.length}</span></h2><p>Explora el consolidado generado desde `integrated_findings.csv`.</p></div><button className="button button-outline" onClick={onClose}>Cerrar análisis</button></div>
      <div className="filter-bar">
        <label className="search-field"><Search size={16} /><input value={filters.query} onChange={(event) => updateFilters({ ...filters, query: event.target.value })} placeholder="Buscar hallazgo, paquete o ruta..." aria-label="Buscar hallazgo de Analyzer" /></label>
        <FilterSelect label="Repositorio" value={filters.repository} options={repositories} onChange={(value) => updateFilters({ ...filters, repository: value })} />
        <FilterSelect label="Herramienta" value={filters.tool} options={tools} onChange={(value) => updateFilters({ ...filters, tool: value })} />
        <FilterSelect label="Severidad" value={filters.severity} options={severityCategories} display={(value) => severityLabels[value as SeverityCategory]} onChange={(value) => updateFilters({ ...filters, severity: value })} />
      </div>
      <div className="table-card analyzer-table-card">
        <div className="table-scroll">
          <table aria-label="Hallazgos de Analyzer"><thead><tr><th>HALLAZGO</th><th>REPOSITORIO</th><th>HERRAMIENTA</th><th>SEVERIDAD</th><th>UBICACIÓN</th><th>CLASIFICACIÓN</th></tr></thead><tbody>{visible.map((finding) => <FindingRow finding={finding} key={finding.id} />)}</tbody></table>
          {!visible.length && <div className="empty-state"><strong>No hay hallazgos para mostrar</strong><span>Prueba con otros filtros o términos de búsqueda.</span></div>}
        </div>
        <Pagination first={firstVisible} last={lastVisible} total={filtered.length} page={currentPage} pageCount={pageCount} onPage={setPage} />
      </div>
    </section>
  );
}

function FindingRow({ finding }: { finding: AnalyzerFinding }) {
  const location = finding.location ? `${finding.location}${finding.line ? `:${finding.line}` : ""}` : finding.packageName ?? "—";
  return <tr><td><span className="finding-name"><strong>{finding.vulnerabilityType}</strong><span>{finding.message || "Sin descripción disponible"}</span></span></td><td><span className="repository-cell">{finding.repository}</span></td><td><ToolBadge tool={finding.tool} /></td><td><SeverityBadge severity={finding.severity} /></td><td><span className="location-cell" title={location}>{location}</span></td><td>{finding.isTest === null ? "—" : finding.isTest ? "Prueba" : "Producción"}</td></tr>;
}

function RepositoryAnalysis({ data }: { data: AnalyzerData }) {
  const priorities = new Map(data.priorities.map((item) => [item.repository, item]));
  const concentration = new Map(data.concentration.map((item) => [item.repository, item]));
  const rows = [...data.repositories].sort((left, right) => right.totalSecurityEvidence - left.totalSecurityEvidence || left.repository.localeCompare(right.repository));
  return (
    <section id="repositories-section" className="repositories-section" aria-labelledby="repository-analysis-title">
      <div className="section-heading compact-heading"><div><div className="section-kicker">PRIORIZACIÓN</div><h2 id="repository-analysis-title">Resumen por repositorio <span className="heading-count">{rows.length}</span></h2><p>Combina el resumen integrado, la prioridad y la concentración calculadas por Analyzer.</p></div></div>
      <div className="table-card standalone-table-card"><div className="table-scroll"><table aria-label="Resumen de Analyzer por repositorio"><thead><tr><th>REPOSITORIO</th><th>CODEQL</th><th>GRYPE</th><th>TOTAL</th><th>VULNERABILIDADES ÚNICAS</th><th>PAQUETES</th><th>PRIORIDAD</th><th>CONCENTRACIÓN</th></tr></thead><tbody>{rows.map((item) => {
        const priority = priorities.get(item.repository);
        const share = concentration.get(item.repository);
        return <tr key={item.repository}><td>{item.repository}</td><td>{item.codeqlFindings.toLocaleString("es-ES")}</td><td>{item.grypeDetections.toLocaleString("es-ES")}</td><td><strong>{item.totalSecurityEvidence.toLocaleString("es-ES")}</strong></td><td>{priority?.uniqueVulnerabilities.toLocaleString("es-ES") ?? "—"}</td><td>{priority?.affectedPackages.toLocaleString("es-ES") ?? "—"}</td><td>{priority?.priorityScore.toLocaleString("es-ES", { maximumFractionDigits: 2 }) ?? "—"}</td><td>{share ? `${share.percentage.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%` : "—"}</td></tr>;
      })}</tbody></table></div><div className="table-footer"><span><strong>{rows.length}</strong> repositorios con evidencia</span><span>{data.severitySummary.map((item) => `${item.severity}: ${item.count}`).join(" · ")}</span></div></div>
    </section>
  );
}

function FilterSelect({ label, value, options, display, onChange }: { label: string; value: string; options: readonly string[]; display?: (value: string) => string; onChange: (value: string) => void }) {
  return <label className="filter-select"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}><option value="all">Todos: {label.toLowerCase()}</option>{options.map((option) => <option value={option} key={option}>{display ? display(option) : option}</option>)}</select></label>;
}

function Pagination({ first, last, total, page, pageCount, onPage }: { first: number; last: number; total: number; page: number; pageCount: number; onPage: (page: number) => void }) {
  return <div className="table-footer analyzer-table-footer"><span>Mostrando <strong>{first}–{last}</strong> de {total}</span><div className="pagination-controls"><button aria-label="Página anterior" disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))}><ArrowLeft size={14} /></button><span>Página {page + 1} de {pageCount}</span><button aria-label="Página siguiente" disabled={page + 1 >= pageCount} onClick={() => onPage(Math.min(pageCount - 1, page + 1))}><ArrowRight size={14} /></button></div></div>;
}
