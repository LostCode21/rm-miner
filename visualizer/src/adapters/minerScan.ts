import type { Finding, Repository, RepositoryCheck, ScanData, ScanSummary, SeverityCategory } from "../domain/scan";
import type { ScanAdapter } from "./scanAdapter";

export class MinerDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MinerDataError";
  }
}

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const optionalText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const number = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const optionalNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function normalizeFinding(raw: unknown, index: number, defaultRepository?: string): Finding | null {
  if (!isObject(raw)) return null;
  const tool = text(raw.tool).trim();
  if (!tool) return null;
  const repository = text(raw.repository, defaultRepository ?? "");
  const vulnerabilityType = text(raw.vulnerability_type, text(raw.rule_id, text(raw.id, "Hallazgo")));
  if (!repository) return null;

  return {
    id: `${repository}-${tool}-${vulnerabilityType}-${text(raw.location, text(raw.file, ""))}-${index}`,
    repository,
    tool,
    vulnerabilityType,
    severity: normalizeMinerSeverity(tool, optionalText(raw.severity)),
    sourceSeverity: optionalText(raw.severity),
    location: optionalText(raw.location) ?? optionalText(raw.file),
    line: optionalNumber(raw.line) ?? optionalNumber(raw.start_line),
    packageName: optionalText(raw.package),
    version: optionalText(raw.version),
    fixedVersion: optionalText(raw.fixed_version),
    artifactType: optionalText(raw.artifact_type),
    language: optionalText(raw.language),
    message: text(raw.message),
  };
}

function normalizeMinerSeverity(tool: string, severity: string | null): SeverityCategory {
  const value = severity?.trim().toLowerCase();
  if (!value) return "unknown";
  if (["critical", "critica", "crítica", "fatal"].includes(value)) return "critical";
  if (["high", "alta"].includes(value) || (tool === "codeql" && value === "error")) return "high";
  if (["medium", "moderate", "media"].includes(value) || (tool === "codeql" && ["warning", "warn"].includes(value))) return "medium";
  if (["low", "baja", "negligible"].includes(value)) return "low";
  if (["info", "informational", "note", "none"].includes(value)) return "info";
  return "unknown";
}

function findingsFromRepositories(organization: string, rawRepositories: unknown[]): Finding[] {
  const findings: Finding[] = [];
  rawRepositories.forEach((rawRepository, repositoryIndex) => {
    if (!isObject(rawRepository)) return;
    const normalizedRepository = normalizeRepository(rawRepository, organization, repositoryIndex);
    if (!normalizedRepository) return;
    const entries = Array.isArray(rawRepository.findings) ? rawRepository.findings : [];
    entries.forEach((entry, index) => {
      const finding = normalizeFinding(
        { ...((isObject(entry) ? entry : {}) as JsonObject), tool: "codeql" },
        findings.length + index,
        normalizedRepository.fullName,
      );
      if (finding) findings.push(finding);
    });

    const grype = isObject(rawRepository.grype) ? rawRepository.grype : {};
    const vulnerabilities = Array.isArray(grype.vulnerabilities) ? grype.vulnerabilities : [];
    vulnerabilities.forEach((entry, index) => {
      if (!isObject(entry)) return;
      const finding = normalizeFinding(
        {
          tool: "grype",
          repository: normalizedRepository.fullName,
          vulnerability_type: entry.id,
          severity: entry.severity,
          location: entry.location,
          package: entry.package,
          version: entry.version,
          fixed_version: entry.fixed_version,
          artifact_type: entry.artifact_type,
          message: entry.message,
        },
        findings.length + index,
      );
      if (finding) findings.push(finding);
    });
  });
  return findings;
}

function normalizeRepository(raw: unknown, organization: string, index: number): Repository | null {
  if (!isObject(raw)) return null;
  const name = text(raw.name, text(raw.full_name).split("/").at(-1) ?? `Repositorio ${index + 1}`);
  const fullName = text(raw.full_name, organization ? `${organization}/${name}` : name);
  const sbom = isObject(raw.sbom) ? raw.sbom : {};
  const grype = isObject(raw.grype) ? raw.grype : {};
  const checks: RepositoryCheck[] = [];
  if (isObject(raw.sbom)) {
    checks.push({ id: "sbom", label: "SBOM", status: optionalText(sbom.status), itemCount: optionalNumber(sbom.component_count) });
  }
  if (isObject(raw.grype)) {
    checks.push({ id: "grype", label: "Grype", status: optionalText(grype.status), itemCount: optionalNumber(grype.vulnerability_count) });
  }
  return {
    name,
    fullName,
    status: normalizeRepositoryStatus(text(raw.status, "unknown")),
    languages: stringList(raw.languages),
    analyzedLanguages: stringList(raw.analyzed_languages),
    error: optionalText(raw.error),
    checks,
  };
}

function normalizeRepositoryStatus(sourceStatus: string): Repository["status"] {
  if (sourceStatus === "analyzed") return "analyzed";
  if (sourceStatus === "unsupported") return "unsupported";
  if (["clone_failed", "database_creation_failed", "analysis_failed"].includes(sourceStatus)) return "failed";
  return "unknown";
}

interface RepositoryCounts {
  analyzed: number;
  failed: number;
  unsupported: number;
  sbomFailures: number;
  dependencyFailures: number;
}

function countRepositories(repositories: Repository[]): RepositoryCounts {
  return repositories.reduce<RepositoryCounts>((counts, repository) => {
    if (repository.status === "analyzed") counts.analyzed += 1;
    if (repository.status === "failed") counts.failed += 1;
    if (repository.status === "unsupported") counts.unsupported += 1;
    if (repository.checks.some((check) => check.id === "sbom" && check.status === "failed")) {
      counts.sbomFailures += 1;
    }
    if (repository.checks.some((check) => check.id === "grype" && check.status === "failed")) {
      counts.dependencyFailures += 1;
    }
    return counts;
  }, { analyzed: 0, failed: 0, unsupported: 0, sbomFailures: 0, dependencyFailures: 0 });
}

function summarize(raw: unknown, organization: string, repositories: Repository[], findings: Finding[], repositoriesWithErrors: number | null, hasCompleteRepositoryData: boolean, counts: RepositoryCounts): ScanSummary {
  const source = isObject(raw) ? raw : {};
  const vulnerabilities = findings.filter((finding) => finding.tool === "grype").length;
  const failedRepositories = hasCompleteRepositoryData ? counts.failed : number(source.failed_repositories, counts.failed);
  return {
    organization: text(source.organization, organization),
    totalRepositories: number(source.total_repositories, repositories.length),
    analyzedRepositories: hasCompleteRepositoryData ? counts.analyzed : number(source.analyzed_repositories, counts.analyzed),
    failedRepositories,
    unsupportedRepositories: hasCompleteRepositoryData ? counts.unsupported : number(source.unsupported_repositories, counts.unsupported),
    totalFindings: findings.length,
    totalVulnerabilities: vulnerabilities,
    repositoriesWithErrors,
    failureBreakdown: [
      { key: "analysis", label: "Análisis", count: failedRepositories },
      { key: "sbom", label: "SBOM", count: hasCompleteRepositoryData ? counts.sbomFailures : number(source.sbom_failed_repositories, counts.sbomFailures) },
      { key: "dependency-analysis", label: "Análisis de dependencias", count: hasCompleteRepositoryData ? counts.dependencyFailures : number(source.grype_failed_repositories, counts.dependencyFailures) },
    ].filter((item) => item.count > 0),
    vulnerabilityBreakdown: vulnerabilities > 0 ? [{ key: "grype", label: "Grype", count: vulnerabilities }] : [],
  };
}

export function parseMinerScan(input: unknown, sourceName = "resultados.json"): Omit<ScanData, "sourceFormat"> {
  if (!isObject(input)) {
    throw new MinerDataError("El archivo debe contener un objeto JSON de resultados.");
  }

  const warnings: string[] = [];
  const organization = text(input.organization, "Organización desconocida");
  const rawRepositories = Array.isArray(input.repositories) ? input.repositories : [];
  if (!Array.isArray(input.repositories)) {
    warnings.push("El JSON no incluye una lista de repositorios; se muestran solo los datos disponibles.");
  }
  let repositories = rawRepositories
    .map((repository, index) => normalizeRepository(repository, organization, index))
    .filter((repository): repository is Repository => repository !== null);
  if (repositories.length < rawRepositories.length) {
    warnings.push("Se omitieron entradas de repositorio con formato no válido.");
  }

  const sourceSummary = isObject(input.summary) ? input.summary : {};
  const repositoryCounts = countRepositories(repositories);
  const reportedRepositoryCount = optionalNumber(sourceSummary.total_repositories);
  const hasCompleteCheckData = repositories.every((repository) => repository.status === "failed"
    || (repository.checks.some((check) => check.id === "sbom") && repository.checks.some((check) => check.id === "grype")));
  const hasCompleteRepositoryData = Array.isArray(input.repositories)
    && repositories.length === rawRepositories.length
    && repositories.every((repository) => repository.status !== "unknown")
    && hasCompleteCheckData
    && (reportedRepositoryCount === null || reportedRepositoryCount === rawRepositories.length);
  let repositoriesWithErrors = hasCompleteRepositoryData
    ? repositories.filter((repository) => isRepositoryFailure(repository)).length
    : null;
  if (Array.isArray(input.repositories) && reportedRepositoryCount !== null && reportedRepositoryCount !== rawRepositories.length) {
    warnings.push(`El resumen informa ${reportedRepositoryCount} repositorios, pero el archivo contiene ${rawRepositories.length} entradas.`);
  }
  if (hasCompleteRepositoryData) {
    const repositoryMetricChecks = [
      { field: "analyzed_repositories", actual: repositoryCounts.analyzed, label: "repositorios analizados" },
      { field: "failed_repositories", actual: repositoryCounts.failed, label: "fallos de análisis" },
      { field: "unsupported_repositories", actual: repositoryCounts.unsupported, label: "repositorios no compatibles" },
      { field: "sbom_failed_repositories", actual: repositoryCounts.sbomFailures, label: "fallos de SBOM" },
      { field: "grype_failed_repositories", actual: repositoryCounts.dependencyFailures, label: "fallos de análisis de dependencias" },
    ];
    for (const metric of repositoryMetricChecks) {
      const reported = optionalNumber(sourceSummary[metric.field]);
      if (reported !== null && reported !== metric.actual) {
        warnings.push(`El resumen informa ${reported} ${metric.label}; los repositorios indican ${metric.actual}.`);
      }
    }
  }

  const rootFindings = Array.isArray(input.findings) ? input.findings : null;
  const hasRootFindings = rootFindings !== null;
  const findings = rootFindings
    ? rootFindings
        .map((finding, index) => normalizeFinding(finding, index))
        .filter((finding): finding is Finding => finding !== null)
    : findingsFromRepositories(organization, rawRepositories);
  if (!hasRootFindings) {
    warnings.push("No se encontró el arreglo consolidado `findings`; se reconstruyeron los hallazgos desde los repositorios.");
  }
  if (rootFindings && findings.length < rootFindings.length) {
    warnings.push("Se omitieron hallazgos incompletos o con formato no válido.");
  }
  const reportedFindingCount = optionalNumber(sourceSummary.total_findings);
  if (reportedFindingCount !== null && reportedFindingCount !== findings.length) {
    warnings.push(`El resumen informa ${reportedFindingCount} hallazgos; se normalizaron ${findings.length} registros válidos.`);
  }
  const normalizedVulnerabilityCount = findings.filter((finding) => finding.tool === "grype").length;
  const reportedVulnerabilityCount = optionalNumber(sourceSummary.total_vulnerabilities);
  if (reportedVulnerabilityCount !== null && reportedVulnerabilityCount !== normalizedVulnerabilityCount) {
    warnings.push(`El resumen informa ${reportedVulnerabilityCount} vulnerabilidades; se normalizaron ${normalizedVulnerabilityCount} registros Grype válidos.`);
  }
  const knownRepositories = new Set(repositories.map((repository) => repository.fullName));
  const missingRepositories = [...new Set(findings.map((finding) => finding.repository))]
    .filter((repository) => !knownRepositories.has(repository));
  if (missingRepositories.length) {
    warnings.push("Algunos hallazgos no tenían metadatos de repositorio; se añadieron entradas parciales.");
    repositoriesWithErrors = null;
    repositories = [
      ...repositories,
      ...missingRepositories.map((fullName) => ({
        name: fullName.split("/").at(-1) || fullName,
        fullName,
        status: "unknown" as const,
        languages: [],
        analyzedLanguages: [],
        error: null,
        checks: [],
      })),
    ];
  }
  if (!isObject(input.summary)) {
    warnings.push("No hay resumen consolidado; algunas métricas se calcularon a partir de los datos disponibles.");
  }
  if (!Array.isArray(input.repositories) && !hasRootFindings) {
    throw new MinerDataError("No se encontró `repositories` ni `findings`. Comprueba que sea un JSON de `miner scan`.");
  }

  return {
    organization,
    summary: summarize(input.summary, organization, repositories, findings, repositoriesWithErrors, hasCompleteRepositoryData, repositoryCounts),
    repositories,
    findings,
    warnings,
    sourceName,
  };
}

function isRepositoryFailure(repository: Repository): boolean {
  return repository.status === "failed" || repository.checks.some((check) => check.status === "failed");
}

export const minerScanAdapter: ScanAdapter = {
  id: "miner-scan",
  supports(input) {
    return isObject(input) && (Array.isArray(input.repositories) || Array.isArray(input.findings));
  },
  parse: parseMinerScan,
};
