import type { VisualizationData } from "../domain/analyzer";

export interface ScanAdapter {
  readonly id: string;
  supports(input: unknown): boolean;
  parse(input: unknown, sourceName: string): VisualizationData;
}
