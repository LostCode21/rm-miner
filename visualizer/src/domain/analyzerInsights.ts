import type { AnalyzerData } from "./analyzer";

export interface AnalyzerInsights {
  securityObservations: string[];
  sbomResults: string[];
  methodology: string[];
}

const formatCount = (value: number) => value.toLocaleString("es-ES");
const formatPercentage = (value: number) => `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function mostFrequent(values: readonly (string | null)[]): [string, number] | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] ?? null;
}

export function deriveAnalyzerInsights(data: AnalyzerData): AnalyzerInsights {
  const codeql = data.findings.filter((finding) => finding.tool === "codeql");
  const grype = data.findings.filter((finding) => finding.tool === "grype");
  const total = data.findings.length;
  const critical = grype.filter((finding) => finding.sourceSeverity?.toLowerCase() === "critical").length;
  const high = grype.filter((finding) => finding.sourceSeverity?.toLowerCase() === "high").length;
  const uniqueVulnerabilities = new Set(grype.map((finding) => finding.vulnerabilityType)).size;
  const uniquePackages = new Set(grype.map((finding) => finding.packageName).filter(Boolean)).size;
  const fixedPercentage = grype.length ? grype.filter((finding) => finding.fixedVersion).length / grype.length * 100 : 0;
  const topGrypeRepository = mostFrequent(grype.map((finding) => finding.repository));
  const topCodeqlRepository = mostFrequent(codeql.map((finding) => finding.repository));
  const topPackage = mostFrequent(grype.map((finding) => finding.packageName));
  const grypeByRepository = [...grype.reduce((counts, finding) => counts.set(finding.repository, (counts.get(finding.repository) ?? 0) + 1), new Map<string, number>()).values()]
    .sort((left, right) => right - left);
  const topThreeShare = grype.length ? grypeByRepository.slice(0, 3).reduce((sum, count) => sum + count, 0) / grype.length * 100 : 0;

  const securityObservations = [
    `El conjunto integrado contiene ${formatCount(total)} hallazgos.`,
    `${formatCount(codeql.length)} (${formatPercentage(total ? codeql.length / total * 100 : 0)}) corresponden a CodeQL.`,
    `${formatCount(grype.length)} (${formatPercentage(total ? grype.length / total * 100 : 0)}) corresponden a Grype.`,
    `Grype identificó ${formatCount(critical)} detecciones Critical y ${formatCount(high)} High.`,
    `Se observaron ${formatCount(uniqueVulnerabilities)} vulnerabilidades Grype únicas en ${formatCount(uniquePackages)} paquetes afectados.`,
    `${formatPercentage(fixedPercentage)} de las detecciones Grype presentan una versión corregida disponible.`,
  ];
  if (topGrypeRepository) securityObservations.push(`El repositorio con más detecciones Grype es ${topGrypeRepository[0]}, con ${formatCount(topGrypeRepository[1])}.`);
  if (topPackage) securityObservations.push(`El paquete con más detecciones Grype es ${topPackage[0]}, con ${formatCount(topPackage[1])}.`);
  if (topCodeqlRepository) securityObservations.push(`El repositorio con más hallazgos CodeQL es ${topCodeqlRepository[0]}, con ${formatCount(topCodeqlRepository[1])}.`);
  if (grype.length) securityObservations.push(`Los tres repositorios con más detecciones concentran ${formatPercentage(topThreeShare)} del total de Grype.`);

  const sbomResults = data.sbom ? [
    `Se procesaron ${formatCount(data.sbom.sbomCount)} SBOM desde las salidas de Analyzer.`,
    `Se encontraron ${formatCount(data.sbom.rawComponentOccurrences)} apariciones y ${formatCount(data.sbom.uniqueComponents)} componentes únicos por repositorio.`,
    `Se descartaron ${formatCount(data.sbom.duplicateOccurrences)} apariciones repetidas para evitar inflar las comparaciones.`,
    `Se identificaron ${formatCount(data.sbom.npmComponents)} componentes npm y ${formatCount(data.sbom.githubActionComponents)} componentes de GitHub Actions o workflows.`,
    `Se identificaron ${formatCount(data.sbom.emptySboms)} SBOM vacíos y ${formatCount(data.sbom.unknownVersions)} componentes sin versión convencional.`,
    `La cobertura global es ${formatPercentage(data.sbom.purlPercentage)} para PURL, ${formatPercentage(data.sbom.cpePercentage)} para CPE y ${formatPercentage(data.sbom.licensePercentage)} para licencias.`,
    `Las salidas contienen ${formatCount(data.sbom.dependencyEdges)} relaciones de dependencia.`,
    `Los tres repositorios con más componentes concentran ${formatPercentage(data.sbom.topThreeComponentShare)} del total.`,
    ...(data.sbom.repositories[0] ? [`El repositorio con más componentes únicos es ${data.sbom.repositories[0].repository}, con ${formatCount(data.sbom.repositories[0].uniqueComponents)}.`] : []),
    ...(data.sbom.sharedPackages[0] ? [`El paquete npm más compartido es ${data.sbom.sharedPackages[0].name}, presente en ${formatCount(data.sbom.sharedPackages[0].repositories)} repositorios.`] : []),
  ] : [];

  return {
    securityObservations,
    sbomResults,
    methodology: [
      "CodeQL aporta evidencia sobre problemas detectados en el código fuente.",
      "Las salidas SBOM de Analyzer describen el inventario y la composición de componentes identificados por Syft.",
      "Grype aporta vulnerabilidades conocidas asociadas a dependencias y componentes.",
      "Las tres dimensiones deben interpretarse conjuntamente, pero no como métricas equivalentes.",
    ],
  };
}
