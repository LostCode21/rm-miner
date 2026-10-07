export const sampleMinerScan = {
  organization: "acme-security",
  repositories: [
    {
      name: "payments-api",
      status: "analyzed",
      languages: ["Python", "Dockerfile"],
      analyzed_languages: ["Python"],
      sbom: { status: "generated", component_count: 42, syft_version: "1.52.0" },
      grype: {
        status: "analyzed",
        vulnerability_count: 2,
        vulnerabilities: [
          { id: "CVE-2024-3094", severity: "Critical", package: "xz", version: "5.6.1", fixed_version: "5.6.2", location: "usr/lib/xz" },
          { id: "CVE-2023-45853", severity: "High", package: "zlib", version: "1.2.11", fixed_version: "1.3", location: "requirements.lock" }
        ]
      },
      findings: [
        { rule_id: "py/sql-injection", severity: "error", message: "La entrada del usuario llega a una consulta SQL sin parametrizar.", file: "src/api/users.py", start_line: 87, language: "Python" },
        { rule_id: "py/clear-text-logging-sensitive-data", severity: "warning", message: "Se podría registrar información sensible en los logs.", file: "src/auth/session.py", start_line: 42, language: "Python" }
      ]
    },
    {
      name: "customer-portal",
      status: "analyzed",
      languages: ["TypeScript", "JavaScript"],
      analyzed_languages: ["JavaScript/TypeScript"],
      sbom: { status: "generated", component_count: 86, syft_version: "1.52.0" },
      grype: { status: "analyzed", vulnerability_count: 1, vulnerabilities: [
        { id: "CVE-2025-12345", severity: "Medium", package: "example-ui", version: "2.4.0", fixed_version: "2.4.2", location: "package-lock.json" }
      ] },
      findings: [
        { rule_id: "js/insecure-randomness", severity: "note", message: "Se utiliza un generador aleatorio no criptográfico.", file: "src/lib/token.ts", start_line: 19, language: "JavaScript/TypeScript" }
      ]
    },
    {
      name: "internal-docs",
      status: "unsupported",
      languages: ["Markdown"],
      analyzed_languages: [],
      sbom: { status: "empty", component_count: 0 },
      grype: { status: "skipped", vulnerability_count: 0, vulnerabilities: [] },
      findings: []
    },
    {
      name: "legacy-worker",
      status: "analysis_failed",
      languages: ["Ruby"],
      analyzed_languages: ["Ruby"],
      error: "CodeQL no pudo crear la base de datos.",
      sbom: { status: "failed", component_count: 0 },
      grype: { status: "skipped", vulnerability_count: 0, vulnerabilities: [] },
      findings: []
    }
  ],
  findings: [
    { repository: "acme-security/payments-api", tool: "codeql", vulnerability_type: "py/sql-injection", severity: "error", location: "src/api/users.py", line: 87, language: "Python", message: "La entrada del usuario llega a una consulta SQL sin parametrizar." },
    { repository: "acme-security/payments-api", tool: "codeql", vulnerability_type: "py/clear-text-logging-sensitive-data", severity: "warning", location: "src/auth/session.py", line: 42, language: "Python", message: "Se podría registrar información sensible en los logs." },
    { repository: "acme-security/payments-api", tool: "grype", vulnerability_type: "CVE-2024-3094", severity: "Critical", location: "usr/lib/xz", package: "xz", version: "5.6.1", fixed_version: "5.6.2", message: "" },
    { repository: "acme-security/payments-api", tool: "grype", vulnerability_type: "CVE-2023-45853", severity: "High", location: "requirements.lock", package: "zlib", version: "1.2.11", fixed_version: "1.3", message: "" },
    { repository: "acme-security/customer-portal", tool: "codeql", vulnerability_type: "js/insecure-randomness", severity: "note", location: "src/lib/token.ts", line: 19, language: "JavaScript/TypeScript", message: "Se utiliza un generador aleatorio no criptográfico." },
    { repository: "acme-security/customer-portal", tool: "grype", vulnerability_type: "CVE-2025-12345", severity: "Medium", location: "package-lock.json", package: "example-ui", version: "2.4.0", fixed_version: "2.4.2", message: "" }
  ],
  summary: {
    organization: "acme-security",
    total_repositories: 4,
    analyzed_repositories: 2,
    failed_repositories: 1,
    sbom_failed_repositories: 1,
    unsupported_repositories: 1,
    total_findings: 6,
    grype_failed_repositories: 0,
    grype_skipped_repositories: 2,
    total_vulnerabilities: 3
  }
};
