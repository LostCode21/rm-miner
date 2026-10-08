import type { AnalyzerSourceFile } from "./analyzerOutputs";

const findingHeader = "repository,tool,vulnerability_type,severity,location,line,package,version,fixed_version,artifact_type,language,message";
const codeqlFinding = 'TanStack/api,codeql,js/sql-injection,warning,src/api.ts,42,,,,,TypeScript,"Entrada, sin validar"';
const grypeFinding = "TanStack/web,grype,CVE-2026-0001,High,/pnpm-lock.yaml,,react,18.0.0,18.2.0,npm,,Dependencia vulnerable";

export const sampleAnalyzerFiles: AnalyzerSourceFile[] = [
  {
    name: "integrated_findings.csv",
    content: `${findingHeader}\n${codeqlFinding}\n${grypeFinding}\n`,
  },
  {
    name: "codeql_findings.csv",
    content: `${findingHeader},is_test\n${codeqlFinding},False\n`,
  },
  {
    name: "grype_findings.csv",
    content: `${findingHeader},severity_weight\n${grypeFinding},3.0\n`,
  },
  {
    name: "repository_integrated_summary.csv",
    content: "repository,codeql_findings,grype_detections,total_security_evidence\nTanStack/api,1,0,1\nTanStack/web,0,1,1\n",
  },
  {
    name: "repository_integrated_summary.json",
    content: JSON.stringify([
      { repository: "TanStack/api", codeql_findings: 1, grype_detections: 0, total_security_evidence: 1 },
      { repository: "TanStack/web", codeql_findings: 0, grype_detections: 1, total_security_evidence: 1 },
    ]),
  },
  {
    name: "grype_repository_priority.csv",
    content: "repository,detections,unique_vulnerabilities,affected_packages,priority_score\nTanStack/web,1,1,1,3.0\n",
  },
  {
    name: "grype_concentration.csv",
    content: "repository,detections,percentage,cumulative_percentage\nTanStack/web,1,100.0,100.0\n",
  },
  {
    name: "grype_severity_summary.json",
    content: JSON.stringify([{ severity: "High", cantidad: 1, porcentaje: 100 }]),
  },
];
