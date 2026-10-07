import type { ReactNode } from "react";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: number | null;
  detail: string;
  tone: "blue" | "red" | "teal" | "orange" | "slate";
}

export function MetricCard({ icon, label, value, detail, tone }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-${tone}`}>{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value === null ? "—" : value.toLocaleString("es-ES")}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}
