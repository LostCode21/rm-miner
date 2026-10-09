const toolLabels: Record<string, string> = {
  codeql: "CodeQL",
  grype: "Grype",
};

export function formatToolLabel(tool: string): string {
  return toolLabels[tool] ?? tool.replaceAll("_", " ");
}
