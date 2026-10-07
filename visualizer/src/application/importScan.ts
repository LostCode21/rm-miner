import { minerScanAdapter } from "../adapters/minerScan";
import type { ScanAdapter } from "../adapters/scanAdapter";
import type { ScanData } from "../domain/scan";

export class UnsupportedScanFormatError extends Error {
  constructor() {
    super("No se reconoce el formato de resultados. Selecciona un JSON compatible.");
    this.name = "UnsupportedScanFormatError";
  }
}

export class AmbiguousScanFormatError extends Error {
  constructor() {
    super("El formato coincide con más de un adaptador. Selecciona un archivo con una versión de esquema identificable.");
    this.name = "AmbiguousScanFormatError";
  }
}

// El registro mantiene el formato de origen fuera de las vistas; futuros adaptadores se agregan aquí.
const scanAdapters: readonly ScanAdapter[] = [minerScanAdapter];

export function importScanResult(
  input: unknown,
  sourceName: string,
  adapters: readonly ScanAdapter[] = scanAdapters,
): ScanData {
  const matches = adapters.filter((candidate) => candidate.supports(input));
  if (matches.length > 1) throw new AmbiguousScanFormatError();
  const adapter = matches[0];
  if (!adapter) throw new UnsupportedScanFormatError();
  return { ...adapter.parse(input, sourceName), sourceFormat: adapter.id };
}
