import type { Finding, ScanData } from "./scan";

export interface AnalyzerFinding extends Finding {
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
  warnings: string[];
}

export type VisualizationData = ScanData | AnalyzerData;

export function isAnalyzerData(data: VisualizationData): data is AnalyzerData {
  return "kind" in data && data.kind === "analyzer";
}
