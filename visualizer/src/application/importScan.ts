import { minerScanAdapter } from "../adapters/minerScan";
import type { ScanAdapter } from "../adapters/scanAdapter";
import type { ScanData } from "../domain/scan";

export class UnsupportedScanFormatError extends Error {
  constructor() {
    super("No se reconoce el formato de resultados. Selecciona un JSON compatible.");
    this.name = "UnsupportedScanFormatError";
  }
}

// El registro mantiene el formato de origen fuera de las vistas; futuros adaptadores se agregan aquí.
const scanAdapters: readonly ScanAdapter[] = [minerScanAdapter];

export function importScanResult(input: unknown, sourceName: string): ScanData {
  const adapter = scanAdapters.find((candidate) => candidate.supports(input));
  if (!adapter) throw new UnsupportedScanFormatError();
  return { ...adapter.parse(input, sourceName), sourceFormat: adapter.id };
}
