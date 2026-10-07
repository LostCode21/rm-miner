import type { RepositoryStatus } from "./scan";

const toolLabels: Record<string, string> = {
  codeql: "CodeQL",
  grype: "Grype",
};

const repositoryStatusLabels: Record<RepositoryStatus, string> = {
  analyzed: "Analizado",
  failed: "Fallido",
  unsupported: "No compatible",
  unknown: "Estado desconocido",
};

const checkStatusLabels: Record<string, string> = {
  analyzed: "Analizado",
  generated: "Generado",
  empty: "Sin componentes",
  failed: "Fallido",
  skipped: "Omitido",
};

export function formatToolLabel(tool: string): string {
  return toolLabels[tool] ?? tool.replaceAll("_", " ");
}

export function formatRepositoryStatus(status: string): string {
  if (Object.hasOwn(repositoryStatusLabels, status)) {
    return repositoryStatusLabels[status as RepositoryStatus];
  }
  return status ? status.replaceAll("_", " ") : repositoryStatusLabels.unknown;
}

export function formatCheckStatus(status: string): string {
  return checkStatusLabels[status] ?? status.replaceAll("_", " ");
}
