# Miner Visualizer

Aplicación web estática para explorar localmente el JSON consolidado de `miner scan`. La interfaz no tiene backend y no envía ni guarda el archivo: se lee en memoria en el navegador solo después de que el usuario lo seleccione.

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

## Formato admitido

El adaptador consume el JSON actual de `miner scan`:

- `summary` para los totales consolidados.
- `repositories` para estados, lenguajes y errores por repositorio.
- `findings` en la raíz para la tabla y gráficos, evitando volver a contar los hallazgos anidados.

Se toleran campos opcionales y resultados parciales, que se muestran con advertencias. Si falta el arreglo raíz `findings`, se intenta reconstruir desde `repositories[].findings` y `repositories[].grype.vulnerabilities`. Las herramientas desconocidas no se descartan y aparecen como fuentes adicionales; la severidad se normaliza para los gráficos sin perder el texto original.

## Organización e integración futura

- `src/domain/scan.ts` define el modelo neutral que consumen las páginas y componentes. No describe directamente las claves del JSON de Miner.
- `src/adapters/minerScan.ts` convierte el JSON de Miner a ese modelo; `src/application/importScan.ts` selecciona un adaptador registrado.
- Las vistas viven en `src/pages/` y los elementos reutilizables en `src/components/`; no leen campos del JSON de entrada.

Cuando se defina el formato del Analyzer, se añadirá un adaptador que produzca el mismo modelo donde los conceptos coincidan. Las métricas específicas se añadirán solo después de acordar su significado. Si ambos formatos resultan estructuralmente parecidos, la selección requerirá una versión de esquema o una elección explícita, en lugar de adivinar por campos ambiguos. Aún no hay compatibilidad con resultados del Analyzer.

Los totales de hallazgos y vulnerabilidades en el dashboard cuentan los registros válidos normalizados. Si difieren de los valores declarados por Miner, se muestra una advertencia. El conteo de repositorios con errores se presenta como no disponible cuando falta información suficiente para calcularlo sin asumir.

## Privacidad

El archivo se procesa localmente en la pestaña. No hay llamadas de red para enviar resultados, credenciales o SBOMs ni almacenamiento persistente; al recargar o cerrar la página, los datos cargados desaparecen. El límite de carga es 25 MB.
