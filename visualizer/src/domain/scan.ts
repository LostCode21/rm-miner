export type SeverityCategory = "critical" | "high" | "medium" | "low" | "info" | "unknown";
export type RepositoryStatus = "analyzed" | "failed" | "unsupported" | "unknown";

export interface SummaryBreakdown {
  key: string;
  label: string;
  count: number;
}

export interface RepositoryCheck {
  id: string;
  label: string;
  status: string | null;
  itemCount: number | null;
}

export interface Finding {
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
}

export interface Repository {
  name: string;
  fullName: string;
  status: RepositoryStatus;
  languages: string[];
  analyzedLanguages: string[];
  error: string | null;
  checks: RepositoryCheck[];
}

export interface ScanSummary {
  organization: string;
  totalRepositories: number;
  analyzedRepositories: number;
  failedRepositories: number;
  unsupportedRepositories: number;
  totalFindings: number;
  totalVulnerabilities: number;
  repositoriesWithErrors: number | null;
  failureBreakdown: SummaryBreakdown[];
  vulnerabilityBreakdown: SummaryBreakdown[];
}

export interface ScanData {
  sourceFormat: string;
  organization: string;
  summary: ScanSummary;
  repositories: Repository[];
  findings: Finding[];
  warnings: string[];
  sourceName: string;
}
