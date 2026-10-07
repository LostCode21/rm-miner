import type { SeverityCategory } from "../domain/scan";
import { severityLabels } from "../domain/severity";

export function SeverityBadge({ severity }: { severity: SeverityCategory }) {
  return <span className={`severity-badge severity-${severity}`}><i aria-hidden="true" />{severityLabels[severity]}</span>;
}

export function ToolBadge({ tool }: { tool: string }) {
  const knownLabels: Record<string, string> = { codeql: "CodeQL", grype: "Grype" };
  const safeClass = tool === "codeql" || tool === "grype" ? tool : "other";
  return <span className={`tool-badge tool-${safeClass}`}><span className="tool-dot" />{knownLabels[tool] ?? tool.replaceAll("_", " ")}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    analyzed: "Analizado",
    failed: "Fallido",
    unsupported: "No compatible",
    unknown: "Estado desconocido",
  };
  const type = status === "analyzed" ? "ok" : status === "unsupported" || status === "unknown" ? "neutral" : "error";
  return <span className={`status-badge status-${type}`}><i />{labels[status] ?? status.replaceAll("_", " ")}</span>;
}

export function formatScanStatus(status: string): string {
  const labels: Record<string, string> = {
    analyzed: "Analizado",
    generated: "Generado",
    empty: "Sin componentes",
    failed: "Fallido",
    skipped: "Omitido",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}
