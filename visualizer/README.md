# Miner Visualizer

Aplicación web estática para explorar localmente el JSON consolidado de `miner scan` y combinar las salidas CSV/JSON de Analyzer. La interfaz no tiene backend y no envía ni guarda los archivos: se leen en memoria en el navegador solo después de que el usuario los seleccione.

## Requisitos

- Node.js 20.19+ o 22.12+ (Node 24 también es compatible).
- npm.

## Ejecutar en desarrollo

Desde este directorio:

```bash
npm ci
npm run dev
```

Abre la URL que indique Vite, selecciona **Cargar resultados** y elige el archivo generado por Miner. Para cargar Analyzer, selecciona conjuntamente sus CSV y JSON desde `analyzer/output/`. Para desarrollar sin un scan, usa **Ver datos de ejemplo**.

```bash
# Desde la raíz del repositorio
miner scan --organization example-org --output resultados.json
```

Después selecciona `resultados.json` en el Visualizer. El navegador no puede abrir automáticamente rutas locales: los archivos de Analyzer deben seleccionarse juntos desde el diálogo de carga o arrastrarse sobre la zona de importación.

## Comprobaciones

```bash
npm test
npm run build
```

## Formatos admitidos

El adaptador consume el JSON actual de `miner scan`:

- `summary` para los totales consolidados.
- `repositories` para estados, lenguajes y errores por repositorio.
- `findings` en la raíz para la tabla y gráficos, evitando volver a contar los hallazgos anidados.

Se toleran campos opcionales y resultados parciales, que se muestran con advertencias. Si falta el arreglo raíz `findings`, se intenta reconstruir desde `repositories[].findings` y `repositories[].grype.vulnerabilities`. Las herramientas desconocidas no se descartan y aparecen como fuentes adicionales; la severidad se normaliza para los gráficos sin perder el texto original.

El dashboard combinado de Analyzer consume directamente las ocho salidas de datos actuales:

- `integrated_findings.csv`, `codeql_findings.csv` y `grype_findings.csv` para evidencias y metadatos específicos por herramienta.
- `repository_integrated_summary.csv` y `repository_integrated_summary.json` para totales por repositorio. El JSON tiene precedencia y ambos se comparan cuando están presentes.
- `grype_repository_priority.csv` y `grype_concentration.csv` para priorización y distribución.
- `grype_severity_summary.json` para el resumen de severidades de dependencias.

Los formatos se detectan por columnas y estructura, no solo por nombre. Los archivos se correlacionan sin duplicar `integrated_findings.csv`; si falta alguno o los totales no coinciden se muestra una advertencia. Los hallazgos se filtran y se paginan de 100 en 100 filas.

## Organización e integración futura

- `src/domain/scan.ts` define el modelo neutral que consumen las páginas y componentes. No describe directamente las claves del JSON de Miner.
- `src/adapters/minerScan.ts` convierte el JSON de Miner a ese modelo; `src/application/importScan.ts` selecciona un adaptador registrado.
- Las vistas viven en `src/pages/` y los elementos reutilizables en `src/components/`; no leen campos del JSON de entrada.

La importación combinada de Analyzer vive en `src/adapters/analyzerOutputs.ts`; allí se analizan CSV con campos citados y JSON, se validan esquemas y se concilian los conteos antes de construir el modelo de la interfaz.

Los totales de hallazgos y vulnerabilidades en el dashboard cuentan los registros válidos normalizados. Si difieren de los valores declarados por Miner, se muestra una advertencia. El conteo de repositorios con errores se presenta como no disponible cuando falta información suficiente para calcularlo sin asumir.

## Privacidad

Los archivos se procesan localmente en la pestaña. No hay llamadas de red para enviar resultados, credenciales o SBOMs ni almacenamiento persistente; al recargar o cerrar la página, los datos cargados desaparecen. El límite conjunto de carga es 25 MB.
