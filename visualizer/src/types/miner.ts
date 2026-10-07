export type Tool = "codeql" | "grype";

export interface Finding {
  id: string;
  repository: string;
  tool: Tool;
  vulnerabilityType: string;
  severity: string | null;
  location: string | null;
  line: number | null;
  packageName: string | null;
  version: string | null;
  fixedVersion: string | null;
  artifactType: string | null;
  language: string | null;
  message: string;
}

export interface Repository {
  name: string;
  fullName: string;
  status: string;
  languages: string[];
  analyzedLanguages: string[];
  error: string | null;
  sbomStatus: string | null;
  sbomComponents: number | null;
  grypeStatus: string | null;
}

export interface ScanSummary {
  organization: string;
  totalRepositories: number;
  analyzedRepositories: number;
  failedRepositories: number;
  unsupportedRepositories: number;
  sbomFailedRepositories: number;
  grypeFailedRepositories: number;
  grypeSkippedRepositories: number;
  totalFindings: number;
  totalVulnerabilities: number;
}

export interface ScanData {
  organization: string;
  summary: ScanSummary;
  repositories: Repository[];
  findings: Finding[];
  warnings: string[];
  sourceName: string;
}
