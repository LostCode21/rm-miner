import { useMemo, useState } from "react";
import { ChevronDown, FilterX, GitBranch, Search, X } from "lucide-react";
import type { Finding, Repository, ScanData, SeverityCategory } from "../domain/scan";
import { severityCategories, severityLabels } from "../domain/severity";
import { SeverityBadge, ToolBadge } from "./Badges";

interface Filters {
  repository: string;
  tool: string;
  severity: string;
  language: string;
  query: string;
}

interface FindingsExplorerProps {
  scan: ScanData;
  onClose: () => void;
}

const initialFilters: Filters = { repository: "all", tool: "all", severity: "all", language: "all", query: "" };

export function FindingsExplorer({ scan, onClose }: FindingsExplorerProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const repositories = useMemo(() => [...new Set([
    ...scan.repositories.map((repository) => repository.fullName),
    ...scan.findings.map((finding) => finding.repository),
  ])].sort(), [scan]);
  const tools = useMemo(() => [...new Set(scan.findings.map((finding) => finding.tool))].sort(), [scan]);
  const languages = useMemo(() => [...new Set(
    scan.findings.map((finding) => finding.language).filter((language): language is string => Boolean(language)),
  )].sort(), [scan]);
  const filteredFindings = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return scan.findings.filter((finding) => {
      const matchesQuery = !query || [finding.vulnerabilityType, finding.message, finding.location, finding.packageName, finding.repository]
        .some((value) => value?.toLowerCase().includes(query));
      return (filters.repository === "all" || finding.repository === filters.repository)
        && (filters.tool === "all" || finding.tool === filters.tool)
        && (filters.severity === "all" || finding.severity === filters.severity)
        && (filters.language === "all" || finding.language === filters.language)
        && matchesQuery;
    });
  }, [scan, filters]);

  const selectedRepository = selectedFinding
    ? scan.repositories.find((repository) => repository.fullName === selectedFinding.repository)
    : undefined;

  return (
    <section id="findings-section" className="findings-section" aria-labelledby="findings-title">
      <div className="section-heading"><div><div className="section-kicker">EXPLORADOR</div><h2 id="findings-title">Hallazgos detectados <span className="heading-count">{filteredFindings.length}</span></h2><p>Filtra y revisa los resultados del análisis.</p></div><button className="button button-outline" onClick={onClose}><X size={15} /> Cerrar análisis</button></div>
      <div className="filter-bar">
        <label className="search-field"><Search size={16} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Buscar hallazgo, paquete o ruta..." aria-label="Buscar hallazgo, paquete o ruta" /></label>
        <FilterSelect label="Repositorio" value={filters.repository} options={repositories} onChange={(value) => setFilters({ ...filters, repository: value })} />
        <FilterSelect label="Herramienta" value={filters.tool} options={tools} display={toolLabel} onChange={(value) => setFilters({ ...filters, tool: value })} />
        <FilterSelect label="Severidad" value={filters.severity} options={severityCategories} display={severityLabel} onChange={(value) => setFilters({ ...filters, severity: value })} />
        <FilterSelect label="Lenguaje" value={filters.language} options={languages} onChange={(value) => setFilters({ ...filters, language: value })} />
        {Object.values(filters).some((value) => value !== "all" && value !== "") && <button className="reset-filters" onClick={() => setFilters(initialFilters)}><FilterX size={15} /> Limpiar</button>}
      </div>
      <div className={`results-layout ${selectedFinding ? "has-selection" : ""}`}>
        <div className="table-card">
          {filteredFindings.length === 0 ? <EmptyFindings /> : <FindingsTable findings={filteredFindings} selectedFinding={selectedFinding} onSelect={setSelectedFinding} />}
          <div className="table-footer"><span>Mostrando <strong>{filteredFindings.length}</strong> de {scan.findings.length} hallazgos válidos</span><span>Resultados de {scan.sourceName}</span></div>
        </div>
        {selectedFinding && <FindingDetail finding={selectedFinding} repository={selectedRepository} onClose={() => setSelectedFinding(null)} />}
      </div>
    </section>
  );
}

function toolLabel(tool: string): string {
  const knownLabels: Record<string, string> = { codeql: "CodeQL", grype: "Grype" };
  return knownLabels[tool] ?? tool.replaceAll("_", " ");
}

function severityLabel(value: string): string {
  return value === "all" ? "Todas las severidades" : severityLabels[value as SeverityCategory];
}

function FilterSelect({ label, value, options, display, onChange }: { label: string; value: string; options: readonly string[]; display?: (value: string) => string; onChange: (value: string) => void }) {
  const allLabel = label === "Herramienta"
    ? "Todas las herramientas"
    : label === "Severidad"
      ? "Todas las severidades"
      : `Todos: ${label.toLowerCase()}`;
  return <label className="filter-select"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}><option value="all">{allLabel}</option>{options.map((option) => <option value={option} key={option}>{display ? display(option) : option}</option>)}</select><ChevronDown size={14} /></label>;
}

function EmptyFindings() {
  return <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><strong>No hay hallazgos para mostrar</strong><span>Prueba con otros filtros o términos de búsqueda.</span></div>;
}

function FindingsTable({ findings, selectedFinding, onSelect }: { findings: Finding[]; selectedFinding: Finding | null; onSelect: (finding: Finding) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>HALLAZGO</th><th>REPOSITORIO</th><th>HERRAMIENTA</th><th>SEVERIDAD</th><th>UBICACIÓN</th></tr></thead><tbody>{findings.map((finding) => <tr key={finding.id} className={selectedFinding?.id === finding.id ? "selected-row" : ""}><td><button className="finding-name" onClick={() => onSelect(finding)}><strong>{finding.vulnerabilityType}</strong><span>{finding.message || "Sin descripción disponible"}</span></button></td><td><span className="repository-cell"><GitBranch size={13} />{finding.repository.split("/").at(-1)}</span></td><td><ToolBadge tool={finding.tool} /></td><td><SeverityBadge severity={finding.severity} /></td><td><span className="location-cell">{finding.location ? `${finding.location}${finding.line ? `:${finding.line}` : ""}` : finding.packageName ?? "—"}</span></td></tr>)}</tbody></table></div>;
}

function FindingDetail({ finding, repository, onClose }: { finding: Finding; repository?: Repository; onClose: () => void }) {
  return <aside className="detail-panel" aria-label="Detalle del hallazgo"><div className="detail-header"><div><span className="section-kicker">DETALLE DEL HALLAZGO</span><button className="detail-close" aria-label="Cerrar detalle" onClick={onClose}><X size={17} /></button></div><h3>{finding.vulnerabilityType}</h3><div className="detail-badges"><SeverityBadge severity={finding.severity} /><ToolBadge tool={finding.tool} /></div></div><div className="detail-body"><DetailField label="Repositorio" value={finding.repository} /><DetailField label="Descripción" value={finding.message || "No hay descripción disponible."} /><DetailField label="Ubicación" value={finding.location ? `${finding.location}${finding.line ? `:${finding.line}` : ""}` : null} /><DetailField label="Lenguaje" value={finding.language} /><DetailField label="Paquete afectado" value={finding.packageName} /><DetailField label="Versión instalada" value={finding.version} /><DetailField label="Versión corregida" value={finding.fixedVersion} /><DetailField label="Tipo de artefacto" value={finding.artifactType} /><DetailField label="Severidad reportada" value={finding.sourceSeverity} />{repository?.error && <DetailField label="Error del repositorio" value={repository.error} />}</div><div className="detail-note">Revisa el contexto en el repositorio antes de priorizar la remediación.</div></aside>;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="detail-field"><span>{label}</span><strong>{value || "No disponible"}</strong></div>;
}
