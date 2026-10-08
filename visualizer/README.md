# Miner Visualizer

Aplicación web estática para explorar localmente el JSON consolidado de `miner scan` y las salidas JSON agregadas de Analyzer. La interfaz no tiene backend y no envía ni guarda el archivo: se lee en memoria en el navegador solo después de que el usuario lo seleccione.

## Requisitos

- Node.js 20.19+ o 22.12+ (Node 24 también es compatible).
- npm.

## Ejecutar en desarrollo

Desde este directorio:

```bash
npm ci
npm run dev
```

Abre la URL que indique Vite, selecciona **Cargar resultados JSON** y elige el archivo generado por Miner. Para desarrollar sin un scan, usa **Ver datos de ejemplo**.

```bash
# Desde la raíz del repositorio
miner scan --organization example-org --output resultados.json
```

Después selecciona `resultados.json` en el Visualizer. El navegador no puede abrir automáticamente ni seguir la ruta local de un resultado o SBOM; cada archivo debe seleccionarse de forma explícita.

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

También se reconocen por su esquema los cuatro JSON generados en `analyzer/output/`:

- `repository_summary.json`: hallazgos, reglas y archivos afectados por repositorio.
- `security_concentration.json`: distribución y porcentaje acumulado de hallazgos de seguridad.
- `sbom_repository_summary.json`: componentes, cobertura de metadatos y relaciones SBOM por repositorio.
- `sbom_shared_packages.json`: paquetes compartidos, versiones, ocurrencias y cobertura entre repositorios.

Las salidas de Analyzer contienen métricas agregadas, no evidencias individuales. Por ese motivo se muestran en tablas y gráficos propios y no se convierten artificialmente en hallazgos, severidades o vulnerabilidades de Miner. Las tablas se pueden filtrar y se paginan de 100 en 100 filas.

## Organización e integración futura

- `src/domain/scan.ts` define el modelo neutral que consumen las páginas y componentes. No describe directamente las claves del JSON de Miner.
- `src/adapters/minerScan.ts` convierte el JSON de Miner a ese modelo; `src/application/importScan.ts` selecciona un adaptador registrado.
- Las vistas viven en `src/pages/` y los elementos reutilizables en `src/components/`; no leen campos del JSON de entrada.

Los adaptadores de Analyzer viven en `src/adapters/analyzerOutputs.ts` y producen modelos separados para cada salida. La selección usa campos distintivos del esquema, no el nombre del archivo; listas vacías o filas incompletas se rechazan para evitar interpretar un formato ambiguo.

Los totales de hallazgos y vulnerabilidades en el dashboard cuentan los registros válidos normalizados. Si difieren de los valores declarados por Miner, se muestra una advertencia. El conteo de repositorios con errores se presenta como no disponible cuando falta información suficiente para calcularlo sin asumir.

## Privacidad

El archivo se procesa localmente en la pestaña. No hay llamadas de red para enviar resultados, credenciales o SBOMs ni almacenamiento persistente; al recargar o cerrar la página, los datos cargados desaparecen. El límite de carga es 25 MB.
