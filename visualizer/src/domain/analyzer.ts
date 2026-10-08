import type { ScanData } from "./scan";

export interface AnalyzerRepositorySummaryRow {
  repository: string;
  totalFindings: number;
  uniqueRules: number;
  filesAffected: number;
  securityFindings: number;
  testFindings: number;
  securityPercentage: number;
  testPercentage: number;
}

export interface AnalyzerSecurityConcentrationRow {
  repository: string;
  securityFindings: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface AnalyzerSbomRepositoryRow {
  repository: string;
  uniqueComponents: number;
  uniqueComponentNames: number;
  npmComponents: number;
  githubActionComponents: number;
  unknownVersions: number;
  withPurl: number;
  withCpe: number;
  withLicense: number;
  rawComponentOccurrences: number;
  purlPercentage: number;
  cpePercentage: number;
  licensePercentage: number;
  dependencyEdges: number;
  dependencySources: number;
  dependencyTargets: number;
}

export interface AnalyzerSharedPackageRow {
  name: string;
  repositories: number;
  versions: number;
  totalOccurrences: number;
  repositoryPercentage: number;
}

interface AnalyzerDataBase {
  kind: "analyzer";
  sourceName: string;
}

export interface AnalyzerRepositorySummaryData extends AnalyzerDataBase {
  sourceFormat: "analyzer-repository-summary";
  rows: AnalyzerRepositorySummaryRow[];
}

export interface AnalyzerSecurityConcentrationData extends AnalyzerDataBase {
  sourceFormat: "analyzer-security-concentration";
  rows: AnalyzerSecurityConcentrationRow[];
}

export interface AnalyzerSbomRepositoryData extends AnalyzerDataBase {
  sourceFormat: "analyzer-sbom-repository-summary";
  rows: AnalyzerSbomRepositoryRow[];
}

export interface AnalyzerSharedPackagesData extends AnalyzerDataBase {
  sourceFormat: "analyzer-sbom-shared-packages";
  rows: AnalyzerSharedPackageRow[];
}

export type AnalyzerData =
  | AnalyzerRepositorySummaryData
  | AnalyzerSecurityConcentrationData
  | AnalyzerSbomRepositoryData
  | AnalyzerSharedPackagesData;

export type VisualizationData = ScanData | AnalyzerData;

export function isAnalyzerData(data: VisualizationData): data is AnalyzerData {
  return "kind" in data && data.kind === "analyzer";
}
