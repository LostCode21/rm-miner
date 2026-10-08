export const sampleAnalyzerRepositorySummary = [
  {
    repository: "api",
    total_findings: 18,
    unique_rules: 7,
    files_affected: 9,
    security_findings: 11,
    test_findings: 4,
    security_percentage: 61.11,
    test_percentage: 22.22,
  },
];

export const sampleAnalyzerSecurityConcentration = [
  {
    repository: "api",
    security_findings: 11,
    percentage: 68.75,
    cumulative_percentage: 68.75,
  },
  {
    repository: "web",
    security_findings: 5,
    percentage: 31.25,
    cumulative_percentage: 100,
  },
];

export const sampleAnalyzerSbomRepositorySummary = [
  {
    repository: "api",
    unique_components: 120,
    unique_component_names: 100,
    npm_components: 110,
    github_action_components: 3,
    unknown_versions: 2,
    with_purl: 118,
    with_cpe: 115,
    with_license: 40,
    raw_component_occurrences: 145,
    purl_percentage: 98.33,
    cpe_percentage: 95.83,
    license_percentage: 33.33,
    dependency_edges: 312,
    dependency_sources: 89,
    dependency_targets: 116,
  },
];

export const sampleAnalyzerSharedPackages = [
  {
    name: "react",
    repositories: 8,
    versions: 3,
    total_occurrences: 12,
    repository_percentage: 80,
  },
];
