import type { CSSProperties } from "react";
import type { Finding, Repository, SeverityCategory } from "../domain/scan";
import { severityCategories, severityLabels } from "../domain/severity";

const severityColors: Record<SeverityCategory, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
  info: "var(--info)",
  unknown: "var(--unknown)",
};

function ChartHeading({ eyebrow, title, total }: { eyebrow: string; title: string; total: number }) {
  return <div className="chart-heading"><div><span className="chart-eyebrow">{eyebrow}</span><h3>{title}</h3></div><span className="chart-total">{total}</span></div>;
}

export function SeverityChart({ findings }: { findings: Finding[] }) {
  const counts = severityCategories.map((key) => ({ key, count: findings.filter((finding) => finding.severity === key).length }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return <article className="chart-card severity-chart"><ChartHeading eyebrow="SEVERIDAD" title="Hallazgos por severidad" total={findings.length} /><div className="severity-bars">{counts.map(({ key, count }) => <div className="severity-row" key={key}><span className="severity-row-label"><i style={{ background: severityColors[key] }} />{severityLabels[key]}</span><div className="bar-track"><span className="bar-fill" style={{ width: `${(count / max) * 100}%`, background: severityColors[key], minWidth: count ? "5px" : "0" }} /></div><strong>{count}</strong></div>)}</div></article>;
}

export function ToolChart({ findings }: { findings: Finding[] }) {
  const counts = [...findings.reduce((tools, finding) => tools.set(finding.tool, (tools.get(finding.tool) ?? 0) + 1), new Map<string, number>())]
    .map(([tool, count]) => ({ tool, count }))
    .sort((left, right) => left.tool.localeCompare(right.tool));
  const total = Math.max(1, findings.length);
  let accumulatedShare = 0;
  const colors = ["#55cbb8", "#ff9a68", "#769ce8", "#c084fc", "#f4bf55", "#ef7192"];
  const segments = counts.map(({ count }, index) => {
    const start = accumulatedShare;
    accumulatedShare += (count / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${accumulatedShare}%`;
  });
  const chartStyle = { "--tool-chart": segments.length ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(#253449 0 100%)" } as CSSProperties;
  return <article className="chart-card tool-chart"><ChartHeading eyebrow="ORIGEN" title="Hallazgos por herramienta" total={findings.length} /><div className="tool-visual"><div className="donut" style={chartStyle}><div className="donut-inner"><strong>{findings.length}</strong><span>hallazgos</span></div></div><div className="tool-legend">{counts.length ? counts.map(({ tool, count }, index) => <div key={tool}><span className="legend-swatch" style={{ background: colors[index % colors.length] }} /><span>{tool === "codeql" ? "CodeQL" : tool === "grype" ? "Grype" : tool.replaceAll("_", " ")}</span><strong>{count}</strong></div>) : <span className="chart-empty">Sin hallazgos</span>}</div></div></article>;
}

export function RepositoryChart({ findings, repositories }: { findings: Finding[]; repositories: Repository[] }) {
  const counts = repositories.map((repository) => ({ name: repository.name, count: findings.filter((finding) => finding.repository === repository.fullName).length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  const max = Math.max(1, ...counts.map((item) => item.count));
  return <article className="chart-card repo-chart"><ChartHeading eyebrow="DISTRIBUCIÓN" title="Hallazgos por repositorio" total={findings.length} /><div className="repo-bars">{counts.length ? counts.map((item) => <div className="repo-bar-row" key={item.name}><span title={item.name}>{item.name}</span><div className="bar-track"><span className="bar-fill repo-fill" style={{ width: `${(item.count / max) * 100}%`, minWidth: item.count ? "5px" : "0" }} /></div><strong>{item.count}</strong></div>) : <div className="chart-empty">Sin repositorios en el resultado.</div>}</div></article>;
}
