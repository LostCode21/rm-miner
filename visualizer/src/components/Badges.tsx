import type { SeverityCategory } from "../domain/analyzer";
import { severityLabels } from "../domain/severity";
import { formatToolLabel } from "../domain/labels";

export function SeverityBadge({ severity }: { severity: SeverityCategory }) {
  return <span className={`severity-badge severity-${severity}`}><i aria-hidden="true" />{severityLabels[severity]}</span>;
}

export function ToolBadge({ tool }: { tool: string }) {
  const safeClass = tool === "codeql" || tool === "grype" ? tool : "other";
  return <span className={`tool-badge tool-${safeClass}`}><span className="tool-dot" />{formatToolLabel(tool)}</span>;
}
