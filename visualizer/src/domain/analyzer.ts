export type SeverityCategory = "critical" | "high" | "medium" | "low" | "info" | "unknown";

export interface AnalyzerFinding {
  id: string;
  repository: string;
  tool: string;
  vulnerabilityType: string;
  severity: SeverityCategory;
  sourceSeverity: string | null;
  location: string | null;
  line: number | null;
  packageName: string | null;
  version: string | null;
  fixedVersion: string | null;
  artifactType: string | null;
  language: string | null;
  message: string;
  isTest: boolean | null;
  severityWeight: number | null;
}

export interface AnalyzerRepositorySummary {
  repository: string;
  codeqlFindings: number;
  grypeDetections: number;
  totalSecurityEvidence: number;
}

export interface AnalyzerRepositoryPriority {
  repository: string;
  detections: number;
  uniqueVulnerabilities: number;
  affectedPackages: number;
  priorityScore: number;
}

export interface AnalyzerConcentration {
  repository: string;
  detections: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface AnalyzerSeveritySummary {
  severity: string;
  count: number;
  percentage: number;
}

export interface AnalyzerSbomRepositorySummary {
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

export interface AnalyzerSharedPackage {
  name: string;
  repositories: number;
  distinctVersions: number;
  occurrences: number;
  repositoryPercentage: number;
}

export interface AnalyzerVersionDiversity {
  name: string;
  distinctVersions: number;
  repositories: number;
}

export interface AnalyzerSbomSummary {
  sbomCount: number;
  rawComponentOccurrences: number;
  uniqueComponents: number;
  duplicateOccurrences: number;
  npmComponents: number;
  githubActionComponents: number;
  unknownVersions: number;
  emptySboms: number;
  purlPercentage: number;
  cpePercentage: number;
  licensePercentage: number;
  dependencyEdges: number;
  topThreeComponentShare: number;
  repositories: AnalyzerSbomRepositorySummary[];
  sharedPackages: AnalyzerSharedPackage[];
  versionDiversity: AnalyzerVersionDiversity[];
}

export interface AnalyzerData {
  kind: "analyzer";
  sourceFormat: "analyzer-results-bundle";
  sourceName: string;
  sourceNames: string[];
  organization: string;
  findings: AnalyzerFinding[];
  repositories: AnalyzerRepositorySummary[];
  priorities: AnalyzerRepositoryPriority[];
  concentration: AnalyzerConcentration[];
  severitySummary: AnalyzerSeveritySummary[];
  sbom: AnalyzerSbomSummary | null;
  warnings: string[];
}
