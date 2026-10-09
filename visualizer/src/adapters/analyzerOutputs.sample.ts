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
  {
    name: "sbom_metadata.csv",
    content: "repository,bom_format,spec_version,serial_number,timestamp,syft_version,raw_components,dependency_nodes\napi,CycloneDX,1.6,urn:api,2026-01-01,Syft 1.0,3,2\nweb,CycloneDX,1.6,urn:web,2026-01-01,Syft 1.0,0,0\n",
  },
  {
    name: "sbom_components.csv",
    content: "repository,component_type,name,version,purl,ecosystem,cpe,licenses,found_by,language,package_type,metadata_type,location,bom_ref,component_identity\napi,library,react,18.0.0,pkg:npm/react@18.0.0,npm,cpe:react,MIT,cataloger,javascript,npm,lock,/package-lock.json,react-ref,pkg:npm/react@18.0.0\n",
  },
  {
    name: "sbom_repository_summary.csv",
    content: "repository,unique_components,unique_component_names,npm_components,github_action_components,unknown_versions,with_purl,with_cpe,with_license,raw_component_occurrences,purl_percentage,cpe_percentage,license_percentage,dependency_edges,dependency_sources,dependency_targets\napi,2,2,1,1,0,2,1,1,3,100,50,50,2,1,2\nweb,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n",
  },
  {
    name: "sbom_repository_summary.json",
    content: JSON.stringify([
      { repository: "api", unique_components: 2, unique_component_names: 2, npm_components: 1, github_action_components: 1, unknown_versions: 0, with_purl: 2, with_cpe: 1, with_license: 1, raw_component_occurrences: 3, purl_percentage: 100, cpe_percentage: 50, license_percentage: 50, dependency_edges: 2, dependency_sources: 1, dependency_targets: 2 },
      { repository: "web", unique_components: 0, unique_component_names: 0, npm_components: 0, github_action_components: 0, unknown_versions: 0, with_purl: 0, with_cpe: 0, with_license: 0, raw_component_occurrences: 0, purl_percentage: 0, cpe_percentage: 0, license_percentage: 0, dependency_edges: 0, dependency_sources: 0, dependency_targets: 0 },
    ]),
  },
  {
    name: "sbom_shared_packages.csv",
    content: "name,repositories,distinct_versions,occurrences,repository_percentage\nreact,1,1,1,50\n",
  },
  {
    name: "sbom_shared_packages.json",
    content: JSON.stringify([{ name: "react", repositories: 1, distinct_versions: 1, occurrences: 1, repository_percentage: 50 }]),
  },
  {
    name: "sbom_version_diversity.csv",
    content: "name,distinct_versions,repositories\ntypescript,2,1\n",
  },
  {
    name: "sbom_unknown_versions.csv",
    content: "repository,component_type,name,version,purl,ecosystem,cpe,licenses,found_by,language,package_type,metadata_type,location,bom_ref,component_identity\n",
  },
  {
    name: "sbom_dependency_edges.csv",
    content: "repository,source_ref,target_ref\napi,app,react-ref\napi,app,action-ref\n",
  },
  {
    name: "sbom_component_concentration.csv",
    content: "repository,unique_components,percentage,cumulative_percentage\napi,2,100,100\nweb,0,0,100\n",
  },
];
