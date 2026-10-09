# Auditoría de seguridad de rm-miner

- Fecha UTC: 2026-10-09T05:30:49.637242+00:00
- Commit: `0b0ed57ba5abf6d05800bed7f58607040f534513`
- Estado: **completa (cribado heuristico)**
- Alcance: 60 archivos versionados del propio checkout; no incluye clones, submódulos ni archivos sin seguimiento.
- Candidatos evaluados: 9

## Hallazgos que requieren revisión

### supply-chain — `.github/workflows/reporter-security.yml:16`

- Prioridad sugerida: low; estado: requiere revisión.
- Evidencia observable: `- uses: actions/checkout@v4`
- Interpretación del modelo (no confirmada): El workflow referencia la acción actions/checkout mediante la etiqueta mutable v4 en lugar de un SHA de commit completo, por lo que su contenido puede cambiar sin que el workflow se modifique.
- Recomendación: Fijar la acción a un SHA de commit completo y revisarla al actualizarla.

### supply-chain — `.github/workflows/reporter-security.yml:19`

- Prioridad sugerida: low; estado: requiere revisión.
- Evidencia observable: `- uses: actions/setup-python@v5`
- Interpretación del modelo (no confirmada): El workflow referencia la acción actions/setup-python mediante la etiqueta mutable v5 en lugar de un SHA de commit completo, lo que deja expuesta la ejecución a cambios aguas arriba.
- Recomendación: Fijar la acción a un SHA de commit completo y revisarla al actualizarla.

### supply-chain — `.github/workflows/reporter-security.yml:31`

- Prioridad sugerida: low; estado: requiere revisión.
- Evidencia observable: `uses: actions/upload-artifact@v4`
- Interpretación del modelo (no confirmada): El workflow referencia la acción actions/upload-artifact mediante la etiqueta mutable v4 en lugar de un SHA de commit completo, lo que deja expuesta la ejecución a cambios aguas arriba.
- Recomendación: Fijar la acción a un SHA de commit completo y revisarla al actualizarla.

### supply-chain — `pyproject.toml:2`

- Prioridad sugerida: low; estado: requiere revisión.
- Evidencia observable: `requires = [&#x27;[literal omitido]&#x27;]`
- Interpretación del modelo (no confirmada): La declaración de requisitos de construcción no muestra las versiones ni el origen de los paquetes, por lo que no se puede evaluar la política de versiones.
- Recomendación: Revisar las versiones fijadas o acotadas de los requisitos de construcción y su procedencia.

### supply-chain — `pyproject.toml:10`

- Prioridad sugerida: low; estado: requiere revisión.
- Evidencia observable: `dependencies = [&#x27;[literal omitido]&#x27;, &#x27;[literal omitido]&#x27;, &#x27;[literal omitido]&#x27;]`
- Interpretación del modelo (no confirmada): Las dependencias declaradas no muestran versiones ni fuentes en la evidencia disponible, así que no es posible determinar si existe un riesgo de cadena de suministro.
- Recomendación: Verificar que las dependencias estén acotadas a versiones conocidas y que provengan de repositorios confiables.

### network — `tests/test_reporter.py:74`

- Prioridad sugerida: low; estado: requiere revisión.
- Evidencia observable: `item = {&#x27;[literal omitido]&#x27;: 1, &#x27;[literal omitido]&#x27;: &#x27;[literal omitido]&#x27;, &#x27;[literal omitido]&#x27;: &#x27;[literal omitido]&#x27;, &#x27;[literal omitido]&#x27;: 2, &#x27;[literal omitido]&#x27;: &#x27;[literal omitido]&#x27;, &#x27;[literal omitido]&#x27;: &#x27;[literal omitido]&#x27;}`
- Interpretación del modelo (no confirmada): El fragmento es un diccionario de datos de prueba sin parámetros de TLS visibles, por lo que no se puede comprobar si se desactiva la validación de certificados.
- Recomendación: Revisar la configuración de la conexión asociada y confirmar que la verificación de certificados permanece activa.

## Límites de cobertura

La detección inicial se limita a patrones de ejecución dinámica, TLS, algunas configuraciones, dependencias declaradas y workflows. Se inventarían lockfiles, pero no se verifican CVE ni se audita exhaustivamente el código, las dependencias o las configuraciones. Ningún candidato se presenta como vulnerabilidad confirmada sin validar su contexto manualmente.
