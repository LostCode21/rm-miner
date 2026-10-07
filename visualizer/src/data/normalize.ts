import type { Finding, Repository, ScanData, ScanSummary, Tool } from "../types/miner";

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
  if (raw.tool !== "codeql" && raw.tool !== "grype") return null;
  const tool: Tool = raw.tool;
  const repository = text(raw.repository, defaultRepository ?? "");
  const vulnerabilityType = text(raw.vulnerability_type, text(raw.rule_id, text(raw.id, "Hallazgo")));
  if (!repository) return null;

  return {
    id: `${repository}-${tool}-${vulnerabilityType}-${text(raw.location, text(raw.file, ""))}-${index}`,
    repository,
    tool,
    vulnerabilityType,
    severity: optionalText(raw.severity),
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

function findingsFromRepositories(repositories: Repository[], rawRepositories: unknown[]): Finding[] {
  const findings: Finding[] = [];
  rawRepositories.forEach((rawRepository, repositoryIndex) => {
    if (!isObject(rawRepository)) return;
    const normalizedRepository = repositories[repositoryIndex];
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
  return {
    name,
    fullName,
    status: text(raw.status, "unknown"),
    languages: stringList(raw.languages),
    analyzedLanguages: stringList(raw.analyzed_languages),
    error: optionalText(raw.error),
    sbomStatus: optionalText(sbom.status),
    sbomComponents: optionalNumber(sbom.component_count),
    grypeStatus: optionalText(grype.status),
  };
}

function summarize(raw: unknown, organization: string, repositories: Repository[], findings: Finding[]): ScanSummary {
  const source = isObject(raw) ? raw : {};
  const vulnerabilities = findings.filter((finding) => finding.tool === "grype").length;
  return {
    organization: text(source.organization, organization),
    totalRepositories: number(source.total_repositories, repositories.length),
    analyzedRepositories: number(source.analyzed_repositories, repositories.filter((repo) => repo.status === "analyzed").length),
    failedRepositories: number(source.failed_repositories, repositories.filter((repo) => ["clone_failed", "database_creation_failed", "analysis_failed"].includes(repo.status)).length),
    unsupportedRepositories: number(source.unsupported_repositories, repositories.filter((repo) => repo.status === "unsupported").length),
    sbomFailedRepositories: number(source.sbom_failed_repositories, repositories.filter((repo) => repo.sbomStatus === "failed").length),
    grypeFailedRepositories: number(source.grype_failed_repositories, repositories.filter((repo) => repo.grypeStatus === "failed").length),
    grypeSkippedRepositories: number(source.grype_skipped_repositories, repositories.filter((repo) => repo.grypeStatus === "skipped").length),
    totalFindings: number(source.total_findings, findings.length),
    totalVulnerabilities: number(source.total_vulnerabilities, vulnerabilities),
  };
}

export function parseMinerScan(input: unknown, sourceName = "resultados.json"): ScanData {
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

  const rootFindings = Array.isArray(input.findings) ? input.findings : null;
  const hasRootFindings = rootFindings !== null;
  const findings = rootFindings
    ? rootFindings
        .map((finding, index) => normalizeFinding(finding, index))
        .filter((finding): finding is Finding => finding !== null)
    : findingsFromRepositories(repositories, rawRepositories);
  if (!hasRootFindings) {
    warnings.push("No se encontró el arreglo consolidado `findings`; se reconstruyeron los hallazgos desde los repositorios.");
  }
  if (rootFindings && findings.length < rootFindings.length) {
    warnings.push("Se omitieron hallazgos incompletos o con formato no válido.");
  }
  const knownRepositories = new Set(repositories.map((repository) => repository.fullName));
  const missingRepositories = [...new Set(findings.map((finding) => finding.repository))]
    .filter((repository) => !knownRepositories.has(repository));
  if (missingRepositories.length) {
    warnings.push("Algunos hallazgos no tenían metadatos de repositorio; se añadieron entradas parciales.");
    repositories = [
      ...repositories,
      ...missingRepositories.map((fullName) => ({
        name: fullName.split("/").at(-1) || fullName,
        fullName,
        status: "unknown",
        languages: [],
        analyzedLanguages: [],
        error: null,
        sbomStatus: null,
        sbomComponents: null,
        grypeStatus: null,
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
    summary: summarize(input.summary, organization, repositories, findings),
    repositories,
    findings,
    warnings,
    sourceName,
  };
}
