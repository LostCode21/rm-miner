import type { SeverityCategory } from "./scan";

export const severityCategories: readonly SeverityCategory[] = ["critical", "high", "medium", "low", "info", "unknown"];

export const severityLabels: Record<SeverityCategory, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
  info: "Info",
  unknown: "Sin dato",
};
