import type {
  AnalyzerRepositorySummaryData,
  AnalyzerRepositorySummaryRow,
  AnalyzerSbomRepositoryData,
  AnalyzerSbomRepositoryRow,
  AnalyzerSecurityConcentrationData,
  AnalyzerSecurityConcentrationRow,
  AnalyzerSharedPackageRow,
  AnalyzerSharedPackagesData,
} from "../domain/analyzer";
import type { ScanAdapter } from "./scanAdapter";

type JsonObject = Record<string, unknown>;

export class AnalyzerDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzerDataError";
  }
}

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstRow = (input: unknown): JsonObject | null =>
  Array.isArray(input) && input.length > 0 && isObject(input[0]) ? input[0] : null;

const hasFields = (input: unknown, fields: readonly string[]): boolean => {
  const row = firstRow(input);
  return row !== null && fields.every((field) => field in row);
};

function rows(input: unknown, format: string): JsonObject[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new AnalyzerDataError(`${format} debe contener una lista no vacía.`);
  }
  return input.map((value, index) => {
    if (!isObject(value)) {
      throw new AnalyzerDataError(`${format}: la fila ${index + 1} no es un objeto válido.`);
    }
    return value;
  });
}

function requiredText(row: JsonObject, field: string, index: number): string {
  const value = row[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new AnalyzerDataError(`La fila ${index + 1} no contiene un valor válido para \`${field}\`.`);
  }
  return value;
}

function requiredNumber(row: JsonObject, field: string, index: number): number {
  const value = row[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AnalyzerDataError(`La fila ${index + 1} no contiene un número válido para \`${field}\`.`);
  }
  return value;
}

function repositorySummary(input: unknown, sourceName: string): AnalyzerRepositorySummaryData {
  const normalized: AnalyzerRepositorySummaryRow[] = rows(input, "repository_summary.json").map((row, index) => ({
    repository: requiredText(row, "repository", index),
    totalFindings: requiredNumber(row, "total_findings", index),
    uniqueRules: requiredNumber(row, "unique_rules", index),
    filesAffected: requiredNumber(row, "files_affected", index),
    securityFindings: requiredNumber(row, "security_findings", index),
    testFindings: requiredNumber(row, "test_findings", index),
    securityPercentage: requiredNumber(row, "security_percentage", index),
    testPercentage: requiredNumber(row, "test_percentage", index),
  }));
  return { kind: "analyzer", sourceFormat: "analyzer-repository-summary", sourceName, rows: normalized };
}

function securityConcentration(input: unknown, sourceName: string): AnalyzerSecurityConcentrationData {
  const normalized: AnalyzerSecurityConcentrationRow[] = rows(input, "security_concentration.json").map((row, index) => ({
    repository: requiredText(row, "repository", index),
    securityFindings: requiredNumber(row, "security_findings", index),
    percentage: requiredNumber(row, "percentage", index),
    cumulativePercentage: requiredNumber(row, "cumulative_percentage", index),
  }));
  return { kind: "analyzer", sourceFormat: "analyzer-security-concentration", sourceName, rows: normalized };
}

function sbomRepositorySummary(input: unknown, sourceName: string): AnalyzerSbomRepositoryData {
  const normalized: AnalyzerSbomRepositoryRow[] = rows(input, "sbom_repository_summary.json").map((row, index) => ({
    repository: requiredText(row, "repository", index),
    uniqueComponents: requiredNumber(row, "unique_components", index),
    uniqueComponentNames: requiredNumber(row, "unique_component_names", index),
    npmComponents: requiredNumber(row, "npm_components", index),
    githubActionComponents: requiredNumber(row, "github_action_components", index),
    unknownVersions: requiredNumber(row, "unknown_versions", index),
    withPurl: requiredNumber(row, "with_purl", index),
    withCpe: requiredNumber(row, "with_cpe", index),
    withLicense: requiredNumber(row, "with_license", index),
    rawComponentOccurrences: requiredNumber(row, "raw_component_occurrences", index),
    purlPercentage: requiredNumber(row, "purl_percentage", index),
    cpePercentage: requiredNumber(row, "cpe_percentage", index),
    licensePercentage: requiredNumber(row, "license_percentage", index),
    dependencyEdges: requiredNumber(row, "dependency_edges", index),
    dependencySources: requiredNumber(row, "dependency_sources", index),
    dependencyTargets: requiredNumber(row, "dependency_targets", index),
  }));
  return { kind: "analyzer", sourceFormat: "analyzer-sbom-repository-summary", sourceName, rows: normalized };
}

function sharedPackages(input: unknown, sourceName: string): AnalyzerSharedPackagesData {
  const normalized: AnalyzerSharedPackageRow[] = rows(input, "sbom_shared_packages.json").map((row, index) => ({
    name: requiredText(row, "name", index),
    repositories: requiredNumber(row, "repositories", index),
    versions: requiredNumber(row, "versions", index),
    totalOccurrences: requiredNumber(row, "total_occurrences", index),
    repositoryPercentage: requiredNumber(row, "repository_percentage", index),
  }));
  return { kind: "analyzer", sourceFormat: "analyzer-sbom-shared-packages", sourceName, rows: normalized };
}

export const analyzerRepositorySummaryAdapter: ScanAdapter = {
  id: "analyzer-repository-summary",
  supports: (input) => hasFields(input, ["repository", "total_findings", "unique_rules", "files_affected", "security_percentage", "test_percentage"]),
  parse: repositorySummary,
};

export const analyzerSecurityConcentrationAdapter: ScanAdapter = {
  id: "analyzer-security-concentration",
  supports: (input) => hasFields(input, ["repository", "security_findings", "percentage", "cumulative_percentage"]),
  parse: securityConcentration,
};

export const analyzerSbomRepositoryAdapter: ScanAdapter = {
  id: "analyzer-sbom-repository-summary",
  supports: (input) => hasFields(input, ["repository", "unique_components", "raw_component_occurrences", "dependency_edges"]),
  parse: sbomRepositorySummary,
};

export const analyzerSharedPackagesAdapter: ScanAdapter = {
  id: "analyzer-sbom-shared-packages",
  supports: (input) => hasFields(input, ["name", "repositories", "versions", "total_occurrences", "repository_percentage"]),
  parse: sharedPackages,
};

export const analyzerAdapters: readonly ScanAdapter[] = [
  analyzerRepositorySummaryAdapter,
  analyzerSecurityConcentrationAdapter,
  analyzerSbomRepositoryAdapter,
  analyzerSharedPackagesAdapter,
];
