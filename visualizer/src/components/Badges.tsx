import type { SeverityCategory } from "../domain/scan";
import { severityLabels } from "../domain/severity";
import { formatCheckStatus, formatRepositoryStatus, formatToolLabel } from "../domain/labels";

export function SeverityBadge({ severity }: { severity: SeverityCategory }) {
  return <span className={`severity-badge severity-${severity}`}><i aria-hidden="true" />{severityLabels[severity]}</span>;
}

export function ToolBadge({ tool }: { tool: string }) {
  const safeClass = tool === "codeql" || tool === "grype" ? tool : "other";
  return <span className={`tool-badge tool-${safeClass}`}><span className="tool-dot" />{formatToolLabel(tool)}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const type = status === "analyzed" ? "ok" : status === "failed" ? "error" : "neutral";
  return <span className={`status-badge status-${type}`}><i />{formatRepositoryStatus(status)}</span>;
}

export function formatScanStatus(status: string): string {
  return formatCheckStatus(status);
}
