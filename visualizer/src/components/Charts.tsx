import type { CSSProperties } from "react";
import type { Finding, Repository, SeverityCategory } from "../domain/scan";
import { severityCategories, severityLabels } from "../domain/severity";
import { formatToolLabel } from "../domain/labels";

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
  const severityCounts = findings.reduce((counts, finding) => {
    counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1);
    return counts;
  }, new Map<SeverityCategory, number>());
  const counts = severityCategories.map((key) => ({ key, count: severityCounts.get(key) ?? 0 }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return <article className="chart-card severity-chart"><ChartHeading eyebrow="SEVERIDAD" title="Hallazgos por severidad" total={findings.length} /><div className="severity-bars">{counts.map(({ key, count }) => <div className="severity-row" key={key}><span className="severity-row-label"><i style={{ background: severityColors[key] }} />{severityLabels[key]}</span><div className="bar-track"><span className="bar-fill" style={{ width: `${(count / max) * 100}%`, background: severityColors[key], minWidth: count ? "5px" : "0" }} /></div><strong>{count}</strong></div>)}</div></article>;
}

export function ToolChart({ findings }: { findings: Finding[] }) {
  const counts = [...findings.reduce((tools, finding) => tools.set(finding.tool, (tools.get(finding.tool) ?? 0) + 1), new Map<string, number>())]
    .map(([tool, count]) => ({ tool, count }))
    .sort((left, right) => left.tool.localeCompare(right.tool));
  const total = Math.max(1, findings.length);
  let accumulatedShare = 0;
  const colorForTool = (index: number) => `hsl(${(index * 137.508) % 360} 65% 58%)`;
  const segments = counts.map(({ count }, index) => {
    const start = accumulatedShare;
    accumulatedShare += (count / total) * 100;
    return `${colorForTool(index)} ${start}% ${accumulatedShare}%`;
  });
  const chartStyle = { "--tool-chart": segments.length ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(#253449 0 100%)" } as CSSProperties;
  return <article className="chart-card tool-chart"><ChartHeading eyebrow="ORIGEN" title="Hallazgos por herramienta" total={findings.length} /><div className="tool-visual"><div className="donut" style={chartStyle}><div className="donut-inner"><strong>{findings.length}</strong><span>hallazgos</span></div></div><div className="tool-legend">{counts.length ? counts.map(({ tool, count }, index) => <div key={tool}><span className="legend-swatch" style={{ background: colorForTool(index) }} /><span>{formatToolLabel(tool)}</span><strong>{count}</strong></div>) : <span className="chart-empty">Sin hallazgos</span>}</div></div></article>;
}

export function RepositoryChart({ findings, repositories }: { findings: Finding[]; repositories: Repository[] }) {
  const findingsByRepository = findings.reduce((counts, finding) => {
    counts.set(finding.repository, (counts.get(finding.repository) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const counts = repositories.map((repository) => ({
    name: repository.name,
    count: findingsByRepository.get(repository.fullName) ?? 0,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  const max = Math.max(1, ...counts.map((item) => item.count));
  return <article className="chart-card repo-chart"><ChartHeading eyebrow="DISTRIBUCIÓN" title="Hallazgos por repositorio" total={findings.length} /><div className="repo-bars">{counts.length ? counts.map((item) => <div className="repo-bar-row" key={item.name}><span title={item.name}>{item.name}</span><div className="bar-track"><span className="bar-fill repo-fill" style={{ width: `${(item.count / max) * 100}%`, minWidth: item.count ? "5px" : "0" }} /></div><strong>{item.count}</strong></div>) : <div className="chart-empty">Sin repositorios en el resultado.</div>}</div></article>;
}
