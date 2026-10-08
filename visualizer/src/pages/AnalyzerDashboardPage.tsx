import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Database,
  FileJson2,
  FolderGit2,
  GitFork,
  PackageSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { MetricCard } from "../components/MetricCard";
import type { AnalyzerData } from "../domain/analyzer";

interface AnalyzerDashboardPageProps {
  data: AnalyzerData;
  error: string;
  onChooseFile: () => void;
  onClose: () => void;
}

type CellValue = string | number;
type MetricTone = "blue" | "red" | "teal" | "orange" | "slate";

interface MetricView {
  label: string;
  value: number;
  detail: string;
  tone: MetricTone;
}

interface ColumnView {
  key: string;
  label: string;
  percentage?: boolean;
}

interface RowView {
  key: string;
  search: string;
  values: Record<string, CellValue>;
}

interface AnalyzerView {
  title: string;
  description: string;
  category: string;
  entityLabel: string;
  tableTitle: string;
  metrics: MetricView[];
  columns: ColumnView[];
  rows: RowView[];
  chartTitle: string;
  chartTotal: number;
  chartRows: { label: string; value: number }[];
}

const PAGE_SIZE = 100;
const metricIcons: ComponentType<{ size?: number }>[] = [FolderGit2, ShieldAlert, Boxes, GitFork];

const sum = <T,>(items: readonly T[], value: (item: T) => number): number =>
  items.reduce((total, item) => total + value(item), 0);

const row = (key: string, values: Record<string, CellValue>): RowView => ({
  key,
  values,
  search: Object.values(values).join(" ").toLowerCase(),
});

function buildView(data: AnalyzerData): AnalyzerView {
  switch (data.sourceFormat) {
    case "analyzer-repository-summary": {
      const totalFindings = sum(data.rows, (item) => item.totalFindings);
      const securityFindings = sum(data.rows, (item) => item.securityFindings);
      const testFindings = sum(data.rows, (item) => item.testFindings);
      return {
        title: "Resumen de repositorios",
        description: "Métricas agregadas por Analyzer para reglas y archivos afectados.",
        category: "ANÁLISIS DE RESULTADOS",
        entityLabel: "repositorios",
        tableTitle: "Resumen por repositorio",
        metrics: [
          { label: "Repositorios", value: data.rows.length, detail: "Con resumen disponible", tone: "blue" },
          { label: "Hallazgos", value: totalFindings, detail: "Total informado por Analyzer", tone: "teal" },
          { label: "Hallazgos de seguridad", value: securityFindings, detail: "Clasificados como seguridad", tone: "orange" },
          { label: "Hallazgos de pruebas", value: testFindings, detail: "Clasificados como pruebas", tone: "slate" },
        ],
        columns: [
          { key: "repository", label: "REPOSITORIO" },
          { key: "totalFindings", label: "HALLAZGOS" },
          { key: "uniqueRules", label: "REGLAS" },
          { key: "filesAffected", label: "ARCHIVOS" },
          { key: "securityFindings", label: "SEGURIDAD" },
          { key: "securityPercentage", label: "% SEGURIDAD", percentage: true },
          { key: "testFindings", label: "PRUEBAS" },
          { key: "testPercentage", label: "% PRUEBAS", percentage: true },
        ],
        rows: data.rows.map((item) => row(item.repository, { ...item })),
        chartTitle: "Repositorios con más hallazgos",
        chartTotal: totalFindings,
        chartRows: data.rows.map((item) => ({ label: item.repository, value: item.totalFindings })),
      };
    }
    case "analyzer-security-concentration": {
      const totalSecurityFindings = sum(data.rows, (item) => item.securityFindings);
      const repositoriesFor80 = data.rows.findIndex((item) => item.cumulativePercentage >= 80) + 1 || data.rows.length;
      const largestShare = Math.max(...data.rows.map((item) => item.percentage));
      return {
        title: "Concentración de seguridad",
        description: "Distribución de los hallazgos de seguridad entre repositorios.",
        category: "CONCENTRACIÓN DE RIESGO",
        entityLabel: "repositorios",
        tableTitle: "Concentración por repositorio",
        metrics: [
          { label: "Repositorios", value: data.rows.length, detail: "Con hallazgos de seguridad", tone: "blue" },
          { label: "Hallazgos de seguridad", value: totalSecurityFindings, detail: "Total distribuido", tone: "orange" },
          { label: "Mayor concentración", value: largestShare, detail: "Porcentaje en un repositorio", tone: "red" },
          { label: "Repositorios para 80%", value: repositoriesFor80, detail: "Según porcentaje acumulado", tone: "slate" },
        ],
        columns: [
          { key: "repository", label: "REPOSITORIO" },
          { key: "securityFindings", label: "HALLAZGOS DE SEGURIDAD" },
          { key: "percentage", label: "PARTICIPACIÓN", percentage: true },
          { key: "cumulativePercentage", label: "ACUMULADO", percentage: true },
        ],
        rows: data.rows.map((item) => row(item.repository, { ...item })),
        chartTitle: "Repositorios con mayor concentración",
        chartTotal: totalSecurityFindings,
        chartRows: data.rows.map((item) => ({ label: item.repository, value: item.securityFindings })),
      };
    }
    case "analyzer-sbom-repository-summary": {
      const componentOccurrences = sum(data.rows, (item) => item.rawComponentOccurrences);
      const unknownVersions = sum(data.rows, (item) => item.unknownVersions);
      const dependencyEdges = sum(data.rows, (item) => item.dependencyEdges);
      return {
        title: "Resumen SBOM por repositorio",
        description: "Cobertura de componentes y relaciones de dependencia observadas por Analyzer.",
        category: "ANÁLISIS DE SBOM",
        entityLabel: "repositorios",
        tableTitle: "Cobertura SBOM por repositorio",
        metrics: [
          { label: "Repositorios", value: data.rows.length, detail: "Con inventario SBOM", tone: "blue" },
          { label: "Ocurrencias", value: componentOccurrences, detail: "Componentes antes de deduplicar", tone: "teal" },
          { label: "Versiones desconocidas", value: unknownVersions, detail: "Suma de los repositorios", tone: unknownVersions ? "orange" : "slate" },
          { label: "Relaciones", value: dependencyEdges, detail: "Aristas de dependencia", tone: "slate" },
        ],
        columns: [
          { key: "repository", label: "REPOSITORIO" },
          { key: "uniqueComponents", label: "COMPONENTES" },
          { key: "uniqueComponentNames", label: "NOMBRES ÚNICOS" },
          { key: "npmComponents", label: "NPM" },
          { key: "githubActionComponents", label: "ACTIONS" },
          { key: "unknownVersions", label: "VERSIÓN DESCONOCIDA" },
          { key: "purlPercentage", label: "PURL", percentage: true },
          { key: "cpePercentage", label: "CPE", percentage: true },
          { key: "licensePercentage", label: "LICENCIA", percentage: true },
          { key: "rawComponentOccurrences", label: "OCURRENCIAS" },
          { key: "dependencyEdges", label: "RELACIONES" },
        ],
        rows: data.rows.map((item) => row(item.repository, { ...item })),
        chartTitle: "Repositorios con más componentes",
        chartTotal: sum(data.rows, (item) => item.uniqueComponents),
        chartRows: data.rows.map((item) => ({ label: item.repository, value: item.uniqueComponents })),
      };
    }
    case "analyzer-sbom-shared-packages": {
      const totalOccurrences = sum(data.rows, (item) => item.totalOccurrences);
      const packagesWithMultipleVersions = data.rows.filter((item) => item.versions > 1).length;
      const maximumRepositories = Math.max(...data.rows.map((item) => item.repositories));
      return {
        title: "Paquetes compartidos",
        description: "Componentes SBOM presentes en varios repositorios y su diversidad de versiones.",
        category: "DEPENDENCIAS COMPARTIDAS",
        entityLabel: "paquetes",
        tableTitle: "Paquetes compartidos entre repositorios",
        metrics: [
          { label: "Paquetes", value: data.rows.length, detail: "Componentes únicos listados", tone: "blue" },
          { label: "Ocurrencias", value: totalOccurrences, detail: "Presencias en los SBOM", tone: "teal" },
          { label: "Múltiples versiones", value: packagesWithMultipleVersions, detail: "Paquetes con diversidad de versión", tone: "orange" },
          { label: "Cobertura máxima", value: maximumRepositories, detail: "Repositorios para un paquete", tone: "slate" },
        ],
        columns: [
          { key: "name", label: "PAQUETE" },
          { key: "repositories", label: "REPOSITORIOS" },
          { key: "repositoryPercentage", label: "COBERTURA", percentage: true },
          { key: "versions", label: "VERSIONES" },
          { key: "totalOccurrences", label: "OCURRENCIAS" },
        ],
        rows: data.rows.map((item) => row(item.name, { ...item })),
        chartTitle: "Paquetes con mayor cobertura",
        chartTotal: data.rows.length,
        chartRows: data.rows.map((item) => ({ label: item.name, value: item.repositories })),
      };
    }
  }
}

const formatCell = (value: CellValue, percentage = false): string =>
  typeof value === "number"
    ? `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}${percentage ? "%" : ""}`
    : value;

export function AnalyzerDashboardPage({ data, error, onChooseFile, onClose }: AnalyzerDashboardPageProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const view = useMemo(() => buildView(data), [data]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery ? view.rows.filter((item) => item.search.includes(normalizedQuery)) : view.rows;
  }, [query, view]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const firstVisible = filteredRows.length ? currentPage * PAGE_SIZE + 1 : 0;
  const lastVisible = Math.min((currentPage + 1) * PAGE_SIZE, filteredRows.length);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section-label">FUENTE</div>
        <div className="workspace-button"><div className="workspace-icon"><Database size={17} /></div><span><strong>Analyzer</strong><small>{view.entityLabel}</small></span></div>
        <div className="sidebar-section-label sidebar-section-spaced">ANÁLISIS</div>
        <nav aria-label="Análisis de Analyzer">
          <a className="sidebar-nav-item active" href="#overview"><ShieldAlert size={17} /><span>Resumen</span><span className="nav-count">{view.rows.length}</span></a>
          <a className="sidebar-nav-item" href="#analyzer-data"><PackageSearch size={17} /><span>Datos</span><span className="nav-count muted-count">{view.rows.length}</span></a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-privacy"><span className="privacy-shield"><ShieldCheck size={17} /></span><div><strong>Datos en este dispositivo</strong><small>El archivo no se transmite</small></div><span className="privacy-dot" /></div>
        <button className="sidebar-load" onClick={onChooseFile}><FileJson2 size={15} /> Cargar otro análisis</button>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Analyzer</span><span className="breadcrumb-slash">/</span><strong>{view.title}</strong></div><div className="topbar-right"><span className="loaded-file"><FileJson2 size={14} />{data.sourceName}</span><button className="icon-button" aria-label="Cargar otro análisis" title="Cargar otro análisis" onClick={onChooseFile}><FileJson2 size={17} /></button></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><div className="eyebrow page-eyebrow"><span className="eyebrow-line" /> {view.category}</div><h1>{view.title}</h1><p>{view.description}</p></div><div className="scan-stamp"><span className="stamp-dot" /> Datos agregados de Analyzer</div></div>

          {error && <div className="alert alert-error dashboard-error" role="alert">{error}</div>}

          <section id="overview" className="metrics-grid" aria-label="Métricas de Analyzer">
            {view.metrics.map((metric, index) => {
              const Icon = metricIcons[index];
              return <MetricCard key={metric.label} icon={<Icon size={18} />} {...metric} />;
            })}
          </section>

          <AnalyzerBarChart title={view.chartTitle} total={view.chartTotal} rows={view.chartRows} />

          <section id="analyzer-data" className="findings-section" aria-labelledby="analyzer-data-title">
            <div className="section-heading"><div><div className="section-kicker">DATOS AGREGADOS</div><h2 id="analyzer-data-title">{view.tableTitle} <span className="heading-count">{filteredRows.length}</span></h2><p>Los valores proceden del archivo generado por Analyzer; no representan hallazgos individuales.</p></div><button className="button button-outline" onClick={onClose}>Cerrar análisis</button></div>
            <div className="filter-bar analyzer-filter-bar">
              <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Buscar en los datos..." aria-label="Buscar en los datos de Analyzer" /></label>
            </div>
            <div className="table-card analyzer-table-card">
              <div className="table-scroll">
                <table aria-label={view.tableTitle}>
                  <thead><tr>{view.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
                  <tbody>{visibleRows.map((item) => <tr key={item.key}>{view.columns.map((column) => <td key={column.key}>{formatCell(item.values[column.key], column.percentage)}</td>)}</tr>)}</tbody>
                </table>
                {visibleRows.length === 0 && <div className="empty-state"><strong>No hay filas que coincidan</strong><span>Prueba con otro término de búsqueda.</span></div>}
              </div>
              <div className="table-footer analyzer-table-footer">
                <span>Mostrando <strong>{firstVisible}–{lastVisible}</strong> de {filteredRows.length}</span>
                <div className="pagination-controls"><button aria-label="Página anterior" disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ArrowLeft size={14} /></button><span>Página {currentPage + 1} de {pageCount}</span><button aria-label="Página siguiente" disabled={currentPage + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}><ArrowRight size={14} /></button></div>
              </div>
            </div>
          </section>

          <footer className="app-footer"><span>Octa-Core · Miner Visualizer</span><span><ShieldCheck size={14} /> El resultado se procesa localmente en tu navegador.</span></footer>
        </div>
      </main>
    </div>
  );
}

function AnalyzerBarChart({ title, total, rows }: { title: string; total: number; rows: { label: string; value: number }[] }) {
  const topRows = [...rows].sort((left, right) => right.value - left.value || left.label.localeCompare(right.label)).slice(0, 8);
  const maximum = Math.max(1, ...topRows.map((item) => item.value));
  return (
    <section className="analyzer-chart-card" aria-label={title}>
      <div className="chart-heading"><div><span className="chart-eyebrow">DISTRIBUCIÓN</span><h3>{title}</h3></div><span className="chart-total">{total.toLocaleString("es-ES")}</span></div>
      <div className="analyzer-bars">{topRows.map((item) => <div className="analyzer-bar-row" key={item.label}><span title={item.label}>{item.label}</span><div className="bar-track"><span className="bar-fill repo-fill" style={{ width: `${(item.value / maximum) * 100}%` }} /></div><strong>{item.value.toLocaleString("es-ES")}</strong></div>)}</div>
    </section>
  );
}
