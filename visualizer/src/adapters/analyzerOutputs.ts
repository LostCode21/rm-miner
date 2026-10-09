import type {
  AnalyzerConcentration,
  AnalyzerData,
  AnalyzerFinding,
  AnalyzerRepositoryPriority,
  AnalyzerRepositorySummary,
  AnalyzerSeveritySummary,
  AnalyzerSbomRepositorySummary,
  AnalyzerSbomSummary,
  AnalyzerSharedPackage,
  AnalyzerVersionDiversity,
} from "../domain/analyzer";
import type { SeverityCategory } from "../domain/scan";

type SourceRow = Record<string, unknown>;

export interface AnalyzerSourceFile {
  name: string;
  content: string;
}

export class AnalyzerDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzerDataError";
  }
}

const findingFields = [
  "repository", "tool", "vulnerability_type", "severity", "location", "line",
  "package", "version", "fixed_version", "artifact_type", "language", "message",
] as const;

export const expectedAnalyzerFiles = [
  "integrated_findings.csv",
  "codeql_findings.csv",
  "grype_findings.csv",
  "repository_integrated_summary.csv",
  "repository_integrated_summary.json",
  "grype_repository_priority.csv",
  "grype_concentration.csv",
  "grype_severity_summary.json",
  "sbom_metadata.csv",
  "sbom_components.csv",
  "sbom_repository_summary.csv",
  "sbom_repository_summary.json",
  "sbom_shared_packages.csv",
  "sbom_shared_packages.json",
  "sbom_version_diversity.csv",
  "sbom_unknown_versions.csv",
  "sbom_dependency_edges.csv",
  "sbom_component_concentration.csv",
] as const;

function isObject(value: unknown): value is SourceRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasFields(row: SourceRow, fields: readonly string[]): boolean {
  return fields.every((field) => field in row);
}

function nonEmptyRows(rows: SourceRow[], name: string): SourceRow[] {
  if (!rows.length) throw new AnalyzerDataError(`${name} no contiene filas de datos.`);
  return rows;
}

/** Parser RFC 4180 acotado: admite comillas escapadas, comas y saltos de línea en campos. */
export function parseCsv(content: string, name = "archivo.csv"): SourceRow[] {
  const matrix: string[][] = [];
  let currentRow: string[] = [];
  let field = "";
  let quoted = false;

  const finishField = () => {
    currentRow.push(field);
    field = "";
  };
  const finishRow = () => {
    finishField();
    if (currentRow.some((value) => value.length > 0)) matrix.push(currentRow);
    currentRow = [];
  };

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quoted) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      finishField();
    } else if (character === "\n") {
      finishRow();
    } else if (character === "\r") {
      if (content[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      field += character;
    }
  }
  if (quoted) throw new AnalyzerDataError(`${name} contiene un campo CSV sin cerrar.`);
  if (field.length || currentRow.length) finishRow();
  if (!matrix.length) throw new AnalyzerDataError(`${name} está vacío.`);

  const headers = matrix[0].map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, "") : value).trim());
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new AnalyzerDataError(`${name} contiene encabezados vacíos o duplicados.`);
  }
  return matrix.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new AnalyzerDataError(`${name}: la fila ${rowIndex + 2} tiene ${values.length} columnas; se esperaban ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function parseJson(content: string, name: string): SourceRow[] {
  let document: unknown;
  try {
    document = JSON.parse(content);
  } catch {
    throw new AnalyzerDataError(`${name} no contiene JSON válido.`);
  }
  if (!Array.isArray(document) || !document.every(isObject)) {
    throw new AnalyzerDataError(`${name} debe contener una lista de objetos.`);
  }
  return document;
}

function text(row: SourceRow, field: string, rowIndex: number): string {
  const value = row[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new AnalyzerDataError(`La fila ${rowIndex + 1} no contiene un valor válido para \`${field}\`.`);
  }
  return value.trim();
}

function optionalText(row: SourceRow, field: string): string | null {
  const value = row[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(row: SourceRow, field: string, rowIndex: number): number {
  const source = row[field];
  const value = typeof source === "number" ? source : typeof source === "string" && source.trim() ? Number(source) : Number.NaN;
  if (!Number.isFinite(value) || value < 0) {
    throw new AnalyzerDataError(`La fila ${rowIndex + 1} no contiene un número válido para \`${field}\`.`);
  }
  return value;
}

function optionalNumber(row: SourceRow, field: string): number | null {
  const source = row[field];
  if (source === null || source === undefined || source === "") return null;
  const value = typeof source === "number" ? source : Number(source);
  return Number.isFinite(value) ? value : null;
}

function optionalBoolean(row: SourceRow, field: string): boolean | null {
  const source = row[field];
  if (typeof source === "boolean") return source;
  if (typeof source !== "string" || !source.trim()) return null;
  if (source.toLowerCase() === "true") return true;
  if (source.toLowerCase() === "false") return false;
  return null;
}

function normalizeSeverity(tool: string, source: string | null): SeverityCategory {
  const value = source?.toLowerCase();
  if (!value) return "unknown";
  if (value === "critical") return "critical";
  if (value === "high" || (tool === "codeql" && value === "error")) return "high";
  if (["medium", "moderate"].includes(value) || (tool === "codeql" && ["warning", "warn"].includes(value))) return "medium";
  if (["low", "negligible"].includes(value)) return "low";
  if (["info", "informational", "note", "none"].includes(value)) return "info";
  return "unknown";
}

function findingKey(row: SourceRow): string {
  return ["repository", "tool", "vulnerability_type", "location", "line", "package", "version", "message"]
    .map((field) => String(row[field] ?? ""))
    .join("\u001f");
}

interface FindingSupplement {
  isTest: boolean | null;
  severityWeight: number | null;
}

function supplements(codeqlRows: SourceRow[], grypeRows: SourceRow[]): Map<string, FindingSupplement[]> {
  const result = new Map<string, FindingSupplement[]>();
  for (const row of [...codeqlRows, ...grypeRows]) {
    const key = findingKey(row);
    const values = result.get(key) ?? [];
    values.push({ isTest: optionalBoolean(row, "is_test"), severityWeight: optionalNumber(row, "severity_weight") });
    result.set(key, values);
  }
  return result;
}

function normalizeFindings(rows: SourceRow[], codeqlRows: SourceRow[], grypeRows: SourceRow[]): AnalyzerFinding[] {
  const details = supplements(codeqlRows, grypeRows);
  return rows.map((row, index) => {
    const repository = text(row, "repository", index);
    const tool = text(row, "tool", index).toLowerCase();
    const vulnerabilityType = text(row, "vulnerability_type", index);
    const sourceSeverity = optionalText(row, "severity");
    const detail = details.get(findingKey(row))?.shift();
    return {
      id: `${tool}-${index}-${repository}-${vulnerabilityType}`,
      repository,
      tool,
      vulnerabilityType,
      severity: normalizeSeverity(tool, sourceSeverity),
      sourceSeverity,
      location: optionalText(row, "location"),
      line: optionalNumber(row, "line"),
      packageName: optionalText(row, "package"),
      version: optionalText(row, "version"),
      fixedVersion: optionalText(row, "fixed_version"),
      artifactType: optionalText(row, "artifact_type"),
      language: optionalText(row, "language"),
      message: optionalText(row, "message") ?? "",
      isTest: detail?.isTest ?? optionalBoolean(row, "is_test"),
      severityWeight: detail?.severityWeight ?? optionalNumber(row, "severity_weight"),
    };
  });
}

function normalizeRepositories(rows: SourceRow[]): AnalyzerRepositorySummary[] {
  return rows.map((row, index) => ({
    repository: text(row, "repository", index),
    codeqlFindings: number(row, "codeql_findings", index),
    grypeDetections: number(row, "grype_detections", index),
    totalSecurityEvidence: number(row, "total_security_evidence", index),
  }));
}

function normalizePriorities(rows: SourceRow[]): AnalyzerRepositoryPriority[] {
  return rows.map((row, index) => ({
    repository: text(row, "repository", index),
    detections: number(row, "detections", index),
    uniqueVulnerabilities: number(row, "unique_vulnerabilities", index),
    affectedPackages: number(row, "affected_packages", index),
    priorityScore: number(row, "priority_score", index),
  }));
}

function normalizeConcentration(rows: SourceRow[]): AnalyzerConcentration[] {
  return rows.map((row, index) => ({
    repository: text(row, "repository", index),
    detections: number(row, "detections", index),
    percentage: number(row, "percentage", index),
    cumulativePercentage: number(row, "cumulative_percentage", index),
  }));
}

function normalizeSeveritySummary(rows: SourceRow[]): AnalyzerSeveritySummary[] {
  return rows.map((row, index) => ({
    severity: text(row, "severity", index),
    count: number(row, "cantidad", index),
    percentage: number(row, "porcentaje", index),
  }));
}

function normalizeSbomRepositories(rows: SourceRow[]): AnalyzerSbomRepositorySummary[] {
  return rows.map((row, index) => ({
    repository: text(row, "repository", index),
    uniqueComponents: number(row, "unique_components", index),
    uniqueComponentNames: number(row, "unique_component_names", index),
    npmComponents: number(row, "npm_components", index),
    githubActionComponents: number(row, "github_action_components", index),
    unknownVersions: number(row, "unknown_versions", index),
    withPurl: number(row, "with_purl", index),
    withCpe: number(row, "with_cpe", index),
    withLicense: number(row, "with_license", index),
    rawComponentOccurrences: number(row, "raw_component_occurrences", index),
    purlPercentage: number(row, "purl_percentage", index),
    cpePercentage: number(row, "cpe_percentage", index),
    licensePercentage: number(row, "license_percentage", index),
    dependencyEdges: optionalNumber(row, "dependency_edges") ?? 0,
    dependencySources: optionalNumber(row, "dependency_sources") ?? 0,
    dependencyTargets: optionalNumber(row, "dependency_targets") ?? 0,
  }));
}

function normalizeSharedPackages(rows: SourceRow[]): AnalyzerSharedPackage[] {
  return rows.map((row, index) => ({
    name: text(row, "name", index),
    repositories: number(row, "repositories", index),
    distinctVersions: number(row, "distinct_versions", index),
    occurrences: number(row, "occurrences", index),
    repositoryPercentage: number(row, "repository_percentage", index),
  }));
}

function normalizeVersionDiversity(rows: SourceRow[]): AnalyzerVersionDiversity[] {
  return rows.map((row, index) => ({
    name: text(row, "name", index),
    distinctVersions: number(row, "distinct_versions", index),
    repositories: number(row, "repositories", index),
  }));
}

function sbomSummariesMatch(left: AnalyzerSbomRepositorySummary[], right: AnalyzerSbomRepositorySummary[]): boolean {
  const sort = (items: AnalyzerSbomRepositorySummary[]) => [...items].sort((a, b) => a.repository.localeCompare(b.repository));
  return JSON.stringify(sort(left)) === JSON.stringify(sort(right));
}

function buildSbomSummary(
  repositories: AnalyzerSbomRepositorySummary[],
  sharedPackages: AnalyzerSharedPackage[],
  versionDiversity: AnalyzerVersionDiversity[],
  metadataRows: SourceRow[],
  componentRows: SourceRow[],
  dependencyRows: SourceRow[],
): AnalyzerSbomSummary | null {
  if (!repositories.length && !metadataRows.length && !componentRows.length) return null;
  const orderedRepositories = [...repositories].sort((left, right) => right.uniqueComponents - left.uniqueComponents || left.repository.localeCompare(right.repository));
  const orderedSharedPackages = [...sharedPackages].sort((left, right) => right.repositories - left.repositories || right.occurrences - left.occurrences || left.name.localeCompare(right.name));
  const orderedVersionDiversity = [...versionDiversity].sort((left, right) => right.distinctVersions - left.distinctVersions || right.repositories - left.repositories || left.name.localeCompare(right.name));
  const uniqueComponents = repositories.length
    ? repositories.reduce((sum, item) => sum + item.uniqueComponents, 0)
    : componentRows.length;
  const rawComponentOccurrences = repositories.reduce((sum, item) => sum + item.rawComponentOccurrences, 0) || uniqueComponents;
  const sum = (field: "npmComponents" | "githubActionComponents" | "unknownVersions" | "withPurl" | "withCpe" | "withLicense" | "dependencyEdges") =>
    repositories.reduce((total, item) => total + item[field], 0);
  const percentage = (value: number) => uniqueComponents ? value / uniqueComponents * 100 : 0;
  const componentCounts = orderedRepositories.map((item) => item.uniqueComponents);
  const topThreeComponentShare = uniqueComponents
    ? componentCounts.slice(0, 3).reduce((total, value) => total + value, 0) / uniqueComponents * 100
    : 0;
  const emptySboms = metadataRows.length
    ? metadataRows.filter((row) => (optionalNumber(row, "raw_components") ?? 0) === 0).length
    : repositories.filter((item) => item.uniqueComponents === 0).length;

  return {
    sbomCount: metadataRows.length || repositories.length,
    rawComponentOccurrences,
    uniqueComponents,
    duplicateOccurrences: Math.max(0, rawComponentOccurrences - uniqueComponents),
    npmComponents: sum("npmComponents") || componentRows.filter((row) => optionalText(row, "package_type") === "npm").length,
    githubActionComponents: sum("githubActionComponents") || componentRows.filter((row) => ["github-action", "github-action-workflow"].includes(optionalText(row, "package_type") ?? "")).length,
    unknownVersions: sum("unknownVersions"),
    emptySboms,
    purlPercentage: percentage(sum("withPurl")),
    cpePercentage: percentage(sum("withCpe")),
    licensePercentage: percentage(sum("withLicense")),
    dependencyEdges: sum("dependencyEdges") || dependencyRows.length,
    topThreeComponentShare,
    repositories: orderedRepositories,
    sharedPackages: orderedSharedPackages,
    versionDiversity: orderedVersionDiversity,
  };
}

function summariesMatch(left: AnalyzerRepositorySummary[], right: AnalyzerRepositorySummary[]): boolean {
  const sort = (items: AnalyzerRepositorySummary[]) => [...items].sort((a, b) => a.repository.localeCompare(b.repository));
  return JSON.stringify(sort(left)) === JSON.stringify(sort(right));
}

function deriveRepositories(findings: AnalyzerFinding[]): AnalyzerRepositorySummary[] {
  const counts = new Map<string, { codeql: number; grype: number }>();
  for (const finding of findings) {
    const current = counts.get(finding.repository) ?? { codeql: 0, grype: 0 };
    if (finding.tool === "codeql") current.codeql += 1;
    if (finding.tool === "grype") current.grype += 1;
    counts.set(finding.repository, current);
  }
  return [...counts].map(([repository, count]) => ({
    repository,
    codeqlFindings: count.codeql,
    grypeDetections: count.grype,
    totalSecurityEvidence: count.codeql + count.grype,
  })).sort((a, b) => b.totalSecurityEvidence - a.totalSecurityEvidence || a.repository.localeCompare(b.repository));
}

function deriveSeverity(findings: AnalyzerFinding[]): AnalyzerSeveritySummary[] {
  const grype = findings.filter((finding) => finding.tool === "grype");
  const counts = new Map<string, number>();
  for (const finding of grype) {
    const severity = finding.sourceSeverity ?? "Unknown";
    counts.set(severity, (counts.get(severity) ?? 0) + 1);
  }
  return [...counts].map(([severity, count]) => ({
    severity,
    count,
    percentage: grype.length ? Number(((count / grype.length) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.count - a.count);
}

function organizationFrom(repositories: AnalyzerRepositorySummary[], findings: AnalyzerFinding[]): string {
  const names = repositories.map((item) => item.repository).concat(findings.map((item) => item.repository));
  const organizations = new Set(names.map((name) => name.includes("/") ? name.split("/", 1)[0] : "").filter(Boolean));
  return organizations.size === 1 ? [...organizations][0] : "Analyzer";
}

export function importAnalyzerFiles(files: readonly AnalyzerSourceFile[]): AnalyzerData {
  if (!files.length) throw new AnalyzerDataError("Selecciona al menos un archivo generado por Analyzer.");

  let integratedRows: SourceRow[] = [];
  let codeqlRows: SourceRow[] = [];
  let grypeRows: SourceRow[] = [];
  let repositoryCsvRows: SourceRow[] = [];
  let repositoryJsonRows: SourceRow[] = [];
  let priorityRows: SourceRow[] = [];
  let concentrationRows: SourceRow[] = [];
  let severityRows: SourceRow[] = [];
  let sbomMetadataRows: SourceRow[] = [];
  let sbomComponentRows: SourceRow[] = [];
  let sbomRepositoryCsvRows: SourceRow[] = [];
  let sbomRepositoryJsonRows: SourceRow[] = [];
  let sbomSharedCsvRows: SourceRow[] = [];
  let sbomSharedJsonRows: SourceRow[] = [];
  let sbomVersionRows: SourceRow[] = [];
  let sbomUnknownVersionRows: SourceRow[] = [];
  let sbomDependencyRows: SourceRow[] = [];
  const recognized = new Set<string>();
  const seenNames = new Set<string>();
  const warnings: string[] = [];

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    if (seenNames.has(lowerName)) {
      warnings.push(`Se ignoró ${file.name}: ya se había cargado un archivo con ese nombre.`);
      continue;
    }
    seenNames.add(lowerName);
    if (lowerName === "results.json" || lowerName.endsWith(".cdx.json")) {
      throw new AnalyzerDataError(`${file.name} no es una salida tabular de Analyzer. Selecciona la carpeta analyzer/output.`);
    }
    const rows = lowerName.endsWith(".csv") ? parseCsv(file.content, file.name) : lowerName.endsWith(".json") ? parseJson(file.content, file.name) : null;
    if (!rows) {
      warnings.push(`Se ignoró ${file.name}: no es CSV ni JSON.`);
      continue;
    }
    const first = rows[0];
    if (!first && (expectedAnalyzerFiles as readonly string[]).includes(lowerName)) {
      recognized.add(lowerName);
      continue;
    }
    if (!first) {
      warnings.push(`Se ignoró ${file.name}: no contiene filas.`);
    } else if (lowerName === "sbom_metadata.csv") {
      sbomMetadataRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_components.csv") {
      sbomComponentRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_repository_summary.csv") {
      sbomRepositoryCsvRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_repository_summary.json") {
      sbomRepositoryJsonRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_shared_packages.csv") {
      sbomSharedCsvRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_shared_packages.json") {
      sbomSharedJsonRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_version_diversity.csv") {
      sbomVersionRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_unknown_versions.csv") {
      sbomUnknownVersionRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_dependency_edges.csv") {
      sbomDependencyRows = rows;
      recognized.add(lowerName);
    } else if (lowerName === "sbom_component_concentration.csv") {
      recognized.add(lowerName);
    } else if (hasFields(first, [...findingFields, "is_test"])) {
      codeqlRows = nonEmptyRows(rows, file.name);
      recognized.add("codeql_findings.csv");
    } else if (hasFields(first, [...findingFields, "severity_weight"])) {
      grypeRows = nonEmptyRows(rows, file.name);
      recognized.add("grype_findings.csv");
    } else if (hasFields(first, findingFields)) {
      integratedRows = nonEmptyRows(rows, file.name);
      recognized.add("integrated_findings.csv");
    } else if (hasFields(first, ["repository", "codeql_findings", "grype_detections", "total_security_evidence"])) {
      if (lowerName.endsWith(".json")) {
        repositoryJsonRows = rows;
        recognized.add("repository_integrated_summary.json");
      } else {
        repositoryCsvRows = rows;
        recognized.add("repository_integrated_summary.csv");
      }
    } else if (hasFields(first, ["repository", "detections", "unique_vulnerabilities", "affected_packages", "priority_score"])) {
      priorityRows = rows;
      recognized.add("grype_repository_priority.csv");
    } else if (hasFields(first, ["repository", "detections", "percentage", "cumulative_percentage"])) {
      concentrationRows = rows;
      recognized.add("grype_concentration.csv");
    } else if (hasFields(first, ["severity", "cantidad", "porcentaje"])) {
      severityRows = rows;
      recognized.add("grype_severity_summary.json");
    } else {
      warnings.push(`Se ignoró ${file.name}: su esquema no corresponde a una salida conocida de Analyzer.`);
    }
  }

  if (!recognized.size) throw new AnalyzerDataError("Ningún archivo corresponde a las salidas actuales de Analyzer.");

  const sourceRows = integratedRows.length ? integratedRows : [...codeqlRows, ...grypeRows];
  const findings = normalizeFindings(sourceRows, codeqlRows, grypeRows);
  const csvRepositories = repositoryCsvRows.length ? normalizeRepositories(repositoryCsvRows) : [];
  const jsonRepositories = repositoryJsonRows.length ? normalizeRepositories(repositoryJsonRows) : [];
  if (csvRepositories.length && jsonRepositories.length && !summariesMatch(csvRepositories, jsonRepositories)) {
    warnings.push("Los resúmenes de repositorios CSV y JSON no coinciden; se utilizó el JSON.");
  }
  const repositories = jsonRepositories.length ? jsonRepositories : csvRepositories.length ? csvRepositories : deriveRepositories(findings);
  const priorities = priorityRows.length ? normalizePriorities(priorityRows) : [];
  const concentration = concentrationRows.length ? normalizeConcentration(concentrationRows) : [];
  const severitySummary = severityRows.length ? normalizeSeveritySummary(severityRows) : deriveSeverity(findings);

  const csvSbomRepositories = sbomRepositoryCsvRows.length ? normalizeSbomRepositories(sbomRepositoryCsvRows) : [];
  const jsonSbomRepositories = sbomRepositoryJsonRows.length ? normalizeSbomRepositories(sbomRepositoryJsonRows) : [];
  if (csvSbomRepositories.length && jsonSbomRepositories.length && !sbomSummariesMatch(csvSbomRepositories, jsonSbomRepositories)) {
    warnings.push("Los resúmenes SBOM CSV y JSON no coinciden; se utilizó el JSON.");
  }
  const sbomRepositories = jsonSbomRepositories.length ? jsonSbomRepositories : csvSbomRepositories;
  const csvSharedPackages = sbomSharedCsvRows.length ? normalizeSharedPackages(sbomSharedCsvRows) : [];
  const jsonSharedPackages = sbomSharedJsonRows.length ? normalizeSharedPackages(sbomSharedJsonRows) : [];
  const sharedPackages = jsonSharedPackages.length ? jsonSharedPackages : csvSharedPackages;
  const versionDiversity = sbomVersionRows.length ? normalizeVersionDiversity(sbomVersionRows) : [];
  const sbom = buildSbomSummary(sbomRepositories, sharedPackages, versionDiversity, sbomMetadataRows, sbomComponentRows, sbomDependencyRows);
  if (sbom && sbomUnknownVersionRows.length && sbomUnknownVersionRows.length !== sbom.unknownVersions) {
    warnings.push(`El detalle contiene ${sbomUnknownVersionRows.length} componentes sin versión y el resumen reporta ${sbom.unknownVersions}.`);
  }

  const missing = expectedAnalyzerFiles.filter((name) => !recognized.has(name));
  if (missing.length) warnings.push(`Faltan salidas de Analyzer: ${missing.join(", ")}. Se muestran los datos disponibles.`);
  if (!integratedRows.length && findings.length) warnings.push("No se incluyó integrated_findings.csv; los hallazgos se reconstruyeron desde los archivos por herramienta.");

  if (integratedRows.length && codeqlRows.length && grypeRows.length && integratedRows.length !== codeqlRows.length + grypeRows.length) {
    warnings.push(`El consolidado contiene ${integratedRows.length} hallazgos, pero CodeQL y Grype suman ${codeqlRows.length + grypeRows.length}.`);
  }
  const codeqlCount = findings.filter((finding) => finding.tool === "codeql").length;
  const grypeCount = findings.filter((finding) => finding.tool === "grype").length;
  if (repositories.length) {
    const reportedCodeql = repositories.reduce((total, item) => total + item.codeqlFindings, 0);
    const reportedGrype = repositories.reduce((total, item) => total + item.grypeDetections, 0);
    if (findings.length && (reportedCodeql !== codeqlCount || reportedGrype !== grypeCount)) {
      warnings.push("Los totales por repositorio no coinciden con el consolidado de hallazgos.");
    }
  }
  const reportedSeverityTotal = severitySummary.reduce((total, item) => total + item.count, 0);
  if (grypeCount && reportedSeverityTotal !== grypeCount) {
    warnings.push(`El resumen de severidades contiene ${reportedSeverityTotal} detecciones y el consolidado Grype contiene ${grypeCount}.`);
  }

  const sourceNames = files.map((file) => file.name);
  return {
    kind: "analyzer",
    sourceFormat: "analyzer-results-bundle",
    sourceName: `${sourceNames.length} archivo${sourceNames.length === 1 ? "" : "s"} de Analyzer`,
    sourceNames,
    organization: organizationFrom(repositories, findings),
    findings,
    repositories,
    priorities,
    concentration,
    severitySummary,
    sbom,
    warnings,
  };
}
