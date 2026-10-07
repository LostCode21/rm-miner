import type { ScanData } from "../domain/scan";

export interface ScanAdapter {
  readonly id: string;
  supports(input: unknown): boolean;
  parse(input: unknown, sourceName: string): Omit<ScanData, "sourceFormat">;
}
