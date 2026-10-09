# Decisiones principales de diseño

## Separación por responsabilidades

La solución se divide en cuatro componentes. Miner obtiene y normaliza evidencias; Analyzer transforma esas evidencias en tablas y agregados; Visualizer presenta exclusivamente las salidas de Analyzer; Reporter audita el checkout del propio proyecto. Esta separación evita acoplar la interfaz web a GitHub o a las herramientas de análisis.

## Adaptadores para herramientas externas

El acceso a GitHub, Git, CodeQL, Syft y Grype está encapsulado en adaptadores. El dominio conserva modelos Python normalizados y no depende del formato de proceso de cada herramienta. Esto permite probar el flujo mediante dobles sin acceder a la red ni ejecutar binarios reales.

## Resultados parciales explícitos

Una falla en un repositorio no detiene el resto del Miner. Los estados y errores quedan incluidos en el JSON consolidado y el proceso termina con código distinto de cero si hubo fallas. Así se preserva la evidencia disponible sin presentar una ejecución parcial como exitosa.

## SBOM antes del análisis de vulnerabilidades

Syft genera SBOM CycloneDX y Grype analiza ese documento en lugar de volver a inspeccionar el código. Se conserva tanto el inventario original como la vista normalizada de vulnerabilidades para mantener trazabilidad.

## Visualización local

Visualizer es una aplicación estática sin backend. Los archivos seleccionados se procesan en memoria en el navegador y no se transmiten. El usuario debe seleccionar explícitamente el directorio generado por Analyzer.

## Alcance limitado de Reporter

Reporter solo considera archivos versionados del checkout raíz y excluye clones, resultados y enlaces simbólicos. Envía al proveedor únicamente candidatos filtrados, no archivos completos, y presenta las respuestas como asuntos que requieren revisión. La clave y el modelo se reciben mediante variables de entorno.

## Contenedor reproducible

El Dev Container fija las versiones y checksums de CodeQL, Syft y Grype. También fija los query packs de CodeQL para Python, JavaScript/TypeScript y Ruby; la CLI sin estos packs puede crear bases, pero no ejecutar las suites usadas por Miner. Las dependencias del proyecto se instalan desde los manifiestos versionados y Node se fija en una versión compatible con Vite. La configuración está orientada a Linux x86_64 para evitar seleccionar silenciosamente binarios incompatibles.

## Separación entre código y evidencias

El código fuente no contiene resultados cambiantes. `scripts/run-delivery.sh` crea un directorio `deliverables/` autocontenido para un segundo release. Los notebooks fuente permanecen sin salidas de ejecución; las copias ejecutadas se guardan junto a las demás evidencias.
