# Miner Visualizer

Aplicación web estática para combinar y explorar localmente las salidas CSV/JSON de Analyzer. La interfaz no tiene backend y no envía ni guarda los archivos: se leen en memoria en el navegador solo después de que el usuario selecciona `analyzer/output/`.

## Requisitos

- Node.js 20.19+ o 22.12+ (Node 24 también es compatible).
- npm.

## Ejecutar en desarrollo

Desde este directorio:

```bash
npm ci
npm run dev
```

Abre la URL que indique Vite, selecciona **Cargar carpeta Analyzer** y concede acceso a `analyzer/output/`. El Visualizer reconoce conjuntamente los resultados de CodeQL, Grype y los agregados SBOM producidos por los notebooks. Para desarrollar sin ejecutar Analyzer, usa **Ver datos de ejemplo**.

El navegador no puede abrir silenciosamente rutas locales: la selección inicial de la carpeta requiere una acción del usuario. Después de conceder acceso, todos los outputs compatibles se procesan automáticamente.

## Comprobaciones

```bash
npm test
npm run build
```

## Formatos admitidos

El dashboard combinado de Analyzer consume directamente las ocho salidas de datos actuales:

- `integrated_findings.csv`, `codeql_findings.csv` y `grype_findings.csv` para evidencias y metadatos específicos por herramienta.
- `repository_integrated_summary.csv` y `repository_integrated_summary.json` para totales por repositorio. El JSON tiene precedencia y ambos se comparan cuando están presentes.
- `grype_repository_priority.csv` y `grype_concentration.csv` para priorización y distribución.
- `grype_severity_summary.json` para el resumen de severidades de dependencias.

También consume las diez salidas `sbom_*` de Analyzer para resumir composición, cobertura de identificadores, licencias, paquetes compartidos, diversidad de versiones y relaciones de dependencia. No acepta `results.json` ni los SBOM CycloneDX originales `*.cdx.json`.

Los formatos se detectan por columnas y estructura, no solo por nombre. Los archivos se correlacionan sin duplicar `integrated_findings.csv`; si falta alguno o los totales no coinciden se muestra una advertencia. Los hallazgos se filtran y se paginan de 100 en 100 filas.

## Organización e integración futura

- `src/domain/analyzer.ts` define el modelo neutral consumido por las vistas y componentes.
- `src/domain/analyzerInsights.ts` deriva las observaciones y conclusiones metodológicas.
- Las vistas viven en `src/pages/` y los elementos reutilizables en `src/components/`; no leen campos del JSON de entrada.

La importación combinada de Analyzer vive en `src/adapters/analyzerOutputs.ts`; allí se analizan CSV con campos citados y JSON, se validan esquemas y se concilian los conteos antes de construir el modelo de la interfaz.

Los totales del dashboard cuentan los registros válidos normalizados. Cuando dos salidas de Analyzer declaran valores incompatibles, la interfaz muestra una advertencia sin completar información mediante suposiciones.

## Privacidad

Los archivos se procesan localmente en la pestaña. No hay llamadas de red para enviar resultados, credenciales o SBOMs ni almacenamiento persistente; al recargar o cerrar la página, los datos cargados desaparecen. El límite conjunto de carga es 64 MB.
