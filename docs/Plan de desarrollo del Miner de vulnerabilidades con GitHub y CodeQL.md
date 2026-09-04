# Plan de desarrollo del Miner de vulnerabilidades con GitHub y CodeQL

## 1. Objetivo general

Desarrollar una aplicación de línea de comandos en Python denominada **miner**, capaz de recibir el nombre de una organización de GitHub, obtener todos sus repositorios mediante la GitHub REST API, clonarlos, analizarlos automáticamente con CodeQL y consolidar los resultados de seguridad en un único archivo JSON validado mediante Pydantic.

El flujo general será:

**Organización GitHub → GitHub REST API → Repositorios → Clonación → Detección de lenguajes → CodeQL → SARIF → Procesamiento → Pydantic → JSON consolidado**

La herramienta deberá continuar procesando la organización incluso cuando uno o varios repositorios produzcan errores.

---

# 2. Alcance funcional

La primera versión deberá cubrir las siguientes capacidades:

1. Recibir el nombre de una organización mediante la línea de comandos.
2. Recibir la ruta del archivo JSON de salida.
3. Obtener `GITHUB_TOKEN` desde una variable de entorno.
4. Consultar todos los repositorios de la organización mediante GitHub REST API.
5. Gestionar correctamente la paginación.
6. Ordenar los repositorios alfabéticamente.
7. Clonar cada repositorio.
8. Determinar qué lenguajes pueden analizarse.
9. Crear una o más bases de datos CodeQL según corresponda.
10. Ejecutar consultas oficiales de seguridad.~
11. Generar resultados intermedios SARIF.
12. Interpretar los archivos SARIF.
13. Convertir cada resultado al modelo interno del miner.
14. Ordenar los hallazgos de manera reproducible.
15. Consolidar todos los repositorios en un único modelo Pydantic.
16. Validar el resultado.
17. Serializarlo en un único archivo JSON.
18. Informar el progreso por terminal.
19. Registrar errores individuales sin interrumpir el procesamiento global.
20. Limpiar o administrar los archivos temporales utilizados durante el análisis.

---

# 3. Arquitectura propuesta

El proyecto no deberá implementarse como un único script.

Una estructura conceptual apropiada sería:

```text
miner/
│
├── pyproject.toml
├── README.md
├── .gitignore
├── .env.example
│
├── src/
│   └── miner/
│       ├── __init__.py
│       ├── cli.py
│       ├── config.py
│       │
│       ├── github/
│       │   ├── __init__.py
│       │   └── client.py
│       │
│       ├── repository/
│       │   ├── __init__.py
│       │   ├── cloner.py
│       │   └── languages.py
│       │
│       ├── codeql/
│       │   ├── __init__.py
│       │   ├── runner.py
│       │   └── detector.py
│       │
│       ├── sarif/
│       │   ├── __init__.py
│       │   └── parser.py
│       │
│       ├── models/
│       │   ├── __init__.py
│       │   ├── finding.py
│       │   ├── repository.py
│       │   └── report.py
│       │
│       ├── output/
│       │   ├── __init__.py
│       │   └── json_writer.py
│       │
│       ├── services/
│       │   └── scan_service.py
│       │
│       └── exceptions.py
│
└── tests/
    ├── test_models.py
    ├── test_github_client.py
    ├── test_sarif_parser.py
    ├── test_json_output.py
    ├── test_language_detection.py
    └── test_scan_service.py
```

Esta estructura separa claramente las responsabilidades y facilita las pruebas.

---

# 4. Responsabilidades de cada componente

## 4.1. `cli.py`

Responsable exclusivamente de la interfaz de línea de comandos mediante **Typer**.

Deberá:

- implementar el comando `scan`;
- recibir `--organization`;
- recibir `--output`;
- validar parámetros;
- mostrar progreso;
- transformar errores generales en mensajes comprensibles;
- delegar el trabajo real al servicio de análisis.

Ejemplo conceptual de uso:

```text
miner scan --organization example-org --output results.json
```

La CLI no deberá implementar directamente lógica de GitHub, CodeQL, SARIF ni generación de JSON.

---

## 4.2. `config.py`

Centralizará la configuración.

Sus responsabilidades serán:

- obtener `GITHUB_TOKEN`;
- verificar que exista;
- definir ubicaciones temporales;
- identificar el ejecutable de Git;
- identificar el ejecutable de CodeQL;
- mantener parámetros generales de ejecución.

Si `GITHUB_TOKEN` no existe, el miner deberá terminar antes de iniciar las consultas a GitHub y mostrar un mensaje claro.

Nunca se deberá imprimir el contenido del token.

---

# 5. Cliente de GitHub

## 5.1. `github/client.py`

Será responsable de toda interacción con GitHub REST API.

El resto del sistema no deberá realizar llamadas HTTP directamente.

Sus responsabilidades serán:

### Autenticación

Utilizar:

```text
GITHUB_TOKEN
```

desde el ambiente.

El token deberá incorporarse solamente en los encabezados HTTP correspondientes.

Nunca deberá:

- escribirse en archivos;
- aparecer en logs;
- incluirse en excepciones;
- almacenarse en el JSON final;
- incluirse en URLs.

### Recuperación de repositorios

El cliente deberá solicitar los repositorios de:

```text
organization
```

y recuperar toda la colección.

### Paginación

La implementación deberá asumir desde el inicio que una organización puede tener más repositorios que los devueltos en una página.

El proceso será conceptualmente:

```text
Página 1
   ↓
repositorios
   ↓
¿existe página siguiente?
   ├── Sí → Página 2
   └── No → terminar
```

La capa GitHub deberá devolver al resto del programa una colección completa de repositorios.

### Información mínima a recuperar

Para cada repositorio será conveniente conservar:

- nombre;
- nombre completo;
- URL web;
- URL utilizada para clonar;
- rama predeterminada;
- indicador de repositorio archivado;
- indicador de repositorio fork, si se considera relevante;
- lenguaje principal informado por GitHub.

No es necesario que todos estos campos aparezcan posteriormente en el JSON final, pero pueden resultar útiles internamente.

---

# 6. Orden de procesamiento

Una vez recuperados todos los repositorios:

1. normalizar la información;
2. ordenarlos por nombre;
3. procesarlos secuencialmente en la primera versión.

El orden alfabético deberá establecerse **antes de comenzar los análisis**.

Una primera versión secuencial será preferible a implementar paralelismo inmediatamente, porque:

- simplifica el manejo de CodeQL;
- reduce consumo de memoria;
- facilita depuración;
- simplifica los directorios temporales;
- produce mensajes de progreso más claros;
- facilita conseguir resultados reproducibles.

El paralelismo puede incorporarse posteriormente como mejora.

---

# 7. Clonación de repositorios

## 7.1. `repository/cloner.py`

Se encargará exclusivamente de ejecutar Git.

Cada repositorio deberá disponer de su propio directorio temporal:

```text
workspace/
├── repo-a/
├── repo-b/
└── repo-c/
```

La clonación deberá utilizar la URL obtenida mediante la API.

Conviene utilizar clonación superficial cuando el análisis no necesite el historial completo:

```text
GitHub
  ↓
git clone
  ↓
workspace/repositorio
```

El componente deberá distinguir como mínimo:

```text
clone_success
clone_failed
```

Un error al clonar deberá transformarse en un estado del repositorio, no en una excepción que detenga el miner completo.

---

# 8. Detección de lenguajes

## 8.1. `repository/languages.py`

Una vez clonado un repositorio, deberá determinarse qué lenguajes son candidatos al análisis.

No conviene depender exclusivamente del campo `language` de GitHub porque un repositorio puede ser multilenguaje.

La detección podrá combinar:

- información obtenida desde GitHub;
- extensiones presentes en el repositorio;
- mecanismos de detección disponibles en CodeQL.

El resultado deberá normalizarse a los identificadores de lenguaje utilizados por CodeQL.

Conceptualmente:

```text
Repositorio
    ↓
Archivos fuente
    ↓
Detección de lenguajes
    ↓
Intersección con lenguajes soportados
    ↓
Lenguajes analizables
```

Si no existe ningún lenguaje analizable:

```text
status = unsupported
```

y el miner continuará con el siguiente repositorio.

---

# 9. Integración con CodeQL

## 9.1. `codeql/runner.py`

Este componente encapsulará toda interacción con **CodeQL CLI**.

Ningún otro módulo deberá construir directamente comandos CodeQL.

La secuencia conceptual será:

```text
Código fuente
    ↓
CodeQL database create
    ↓
Base de datos CodeQL
    ↓
CodeQL database analyze
    ↓
SARIF
```

---

# 10. Creación de bases de datos CodeQL

Para cada lenguaje detectado se deberá determinar el mecanismo apropiado para crear la base de datos.

El componente deberá generar una ubicación separada:

```text
workspace/
└── repo-a/
    ├── source/
    ├── databases/
    │   ├── python/
    │   └── javascript/
    └── sarif/
```

Cuando falle la creación de una base de datos, deberá registrarse:

```text
database_creation_failed
```

junto con una descripción resumida del error.

La salida de CodeQL deberá capturarse para diagnóstico, pero no deberá copiarse directamente al JSON de resultados.

---

# 11. Consultas CodeQL

No se desarrollarán consultas `.ql` propias.

El miner utilizará exclusivamente las consultas de seguridad proporcionadas por CodeQL.

Se deberá definir explícitamente en el diseño qué suite se utilizará.

Por ejemplo, conceptualmente:

```text
Security queries
```

o una suite de seguridad y calidad, dependiendo de los requisitos finales.

La elección deberá ser consistente entre repositorios para mantener comparabilidad y reproducibilidad.

También sería conveniente registrar internamente:

- lenguaje;
- suite utilizada;
- versión de CodeQL;
- resultado de ejecución.

---

# 12. Generación SARIF

Cada análisis producirá un archivo SARIF temporal.

Por ejemplo:

```text
workspace/repo-a/sarif/python.sarif
workspace/repo-a/sarif/javascript.sarif
```

Los SARIF serán artefactos intermedios.

No serán la entrega final.

Después deberán ser procesados por:

```text
sarif/parser.py
```

---

# 13. Parser SARIF

## 13.1. `sarif/parser.py`

Este será uno de los componentes principales del proyecto.

Su responsabilidad será transformar SARIF a un modelo mucho más simple y uniforme.

Deberá recuperar como mínimo:

```text
rule_id
severity
message
file
start_line
```

Podría además recuperar:

```text
start_column
end_line
end_column
language
rule_name
rule_description
```

cuando estén disponibles.

El parser no deberá depender de la CLI ni de GitHub.

De esta forma puede probarse utilizando archivos SARIF pequeños almacenados como fixtures.

---

# 14. Normalización de rutas

Las rutas almacenadas en el JSON final deberán ser relativas al repositorio.

Por ejemplo, en lugar de:

```text
/tmp/miner/abc123/repository/src/app.py
```

deberá aparecer:

```text
src/app.py
```

Esto es importante para:

- reproducibilidad;
- comparación entre ejecuciones;
- evitar divulgar rutas locales;
- mantener el JSON independiente del equipo.

---

# 15. Modelo de datos con Pydantic

Los datos deberán representarse mediante modelos Pydantic antes de escribir el archivo JSON.

Se recomienda separar al menos cuatro conceptos.

## Finding

Representará un hallazgo individual:

```text
Finding
├── rule_id
├── severity
├── message
├── file
├── start_line
├── start_column
└── language
```

## RepositoryResult

Representará el procesamiento completo de un repositorio:

```text
RepositoryResult
├── name
├── url
├── status
├── languages
├── findings_count
├── findings
└── error
```

## Summary

Representará las estadísticas generales:

```text
Summary
├── repositories
├── analyzed
├── failed
├── unsupported
└── findings
```

## OrganizationReport

Será el modelo raíz:

```text
OrganizationReport
├── organization
├── summary
└── repositories
```

El JSON final deberá generarse directamente desde `OrganizationReport`.

---

# 16. Estados de repositorio

Conviene definir estados explícitos y cerrados.

Como mínimo:

```text
analyzed
clone_failed
unsupported
database_creation_failed
analysis_failed
```

Opcionalmente:

```text
partial
```

puede utilizarse cuando un repositorio multilenguaje permita analizar un lenguaje pero otro falle.

Por ejemplo:

```text
Repositorio Python + JavaScript

Python       → analizado
JavaScript   → falla CodeQL

Resultado global → partial
```

Esto entrega información más precisa que marcar todo el repositorio como fallido.

---

# 17. Manejo de errores

El principio fundamental será:

> Un error de repositorio nunca debe convertirse automáticamente en un error de toda la organización.

El flujo deberá funcionar conceptualmente así:

```text
Repositorio A
   ↓
OK
   ↓
Repositorio B
   ↓
Error clonación
   ↓
registrar error
   ↓
Repositorio C
   ↓
continuar normalmente
```

Solo deberían terminar completamente la ejecución errores globales como:

- parámetros CLI inválidos;
- ausencia de `GITHUB_TOKEN`;
- organización inexistente o inaccesible;
- imposibilidad de escribir el archivo final;
- CodeQL CLI no instalado;
- Git no instalado.

---

# 18. Información de error en JSON

Los errores por repositorio deberían representarse estructuralmente.

Por ejemplo:

```text
status: database_creation_failed

error:
    stage: codeql_database_create
    message: CodeQL database creation failed
```

No es recomendable almacenar trazas completas de Python ni cientos de líneas de salida de procesos externos.

El JSON final debe describir el problema, no convertirse en un archivo de logs.

---

# 19. Orden reproducible

La reproducibilidad será implementada explícitamente.

## Repositorios

Orden:

```text
repository.name
```

alfabéticamente.

## Hallazgos

Una clave estable apropiada será:

```text
file
→ start_line
→ rule_id
→ message
```

Por ejemplo:

```text
src/a.py, 10, py/sql-injection
src/a.py, 25, py/code-injection
src/b.py, 5, py/path-injection
```

Cuando el mismo estado de una organización sea analizado dos veces, el orden lógico del JSON deberá mantenerse.

---

# 20. Resumen global

El resumen se calculará después de procesar todos los repositorios.

Conceptualmente:

```text
repositories = total descubierto

analyzed = repositorios exitosamente analizados

failed = repositorios con errores

unsupported = repositorios sin lenguaje compatible

findings = suma de todos los hallazgos
```

El resumen deberá derivarse de los resultados individuales, evitando mantener varios contadores independientes que puedan quedar inconsistentes.

---

# 21. Servicio de orquestación

## `services/scan_service.py`

Será el núcleo del flujo.

Coordinará:

```text
GitHubClient
      ↓
RepositoryCloner
      ↓
LanguageDetector
      ↓
CodeQLRunner
      ↓
SarifParser
      ↓
Pydantic models
      ↓
Report
```

No deberá contener detalles específicos de HTTP, Git ni estructura interna de SARIF.

Su trabajo será orquestar componentes.

Esto facilita posteriormente reemplazar componentes individuales.

---

# 22. Flujo completo por repositorio

Para cada repositorio:

```text
1. Recibir RepositoryInfo
        ↓
2. Crear directorio temporal
        ↓
3. Clonar repositorio
        ↓
4. Detectar lenguajes
        ↓
5. Determinar lenguajes CodeQL compatibles
        ↓
6. Crear base de datos
        ↓
7. Ejecutar consultas
        ↓
8. Generar SARIF
        ↓
9. Leer SARIF
        ↓
10. Convertir resultados a Finding
        ↓
11. Ordenar findings
        ↓
12. Construir RepositoryResult
        ↓
13. Continuar con siguiente repositorio
```

---

# 23. Flujo general del comando `scan`

```text
miner scan
    ↓
Validar argumentos
    ↓
Leer GITHUB_TOKEN
    ↓
Verificar Git
    ↓
Verificar CodeQL CLI
    ↓
Consultar GitHub API
    ↓
Recuperar todas las páginas
    ↓
Ordenar repositorios
    ↓
┌──────────────────────────┐
│ Procesar repositorio 1   │
│ Procesar repositorio 2   │
│ Procesar repositorio 3   │
│ ...                      │
└──────────────────────────┘
    ↓
Construir Summary
    ↓
Construir OrganizationReport
    ↓
Validar con Pydantic
    ↓
Ordenar estructura
    ↓
Generar JSON
    ↓
Finalizar
```

---

# 24. Progreso mostrado en terminal

La terminal deberá utilizarse exclusivamente para información operacional.

Ejemplo conceptual:

```text
Organization: example-org

[1/10] project-a
       Cloning repository... OK
       Languages: Python
       Creating CodeQL database... OK
       Running security queries... OK
       Findings: 3

[2/10] project-b
       Cloning repository... FAILED
       Continuing...

[3/10] project-c
       Languages: unsupported
       Skipping...

Completed.

Repositories: 10
Analyzed: 8
Failed: 1
Unsupported: 1
Findings: 15

Results written to: results.json
```

Estos mensajes nunca deberán escribirse dentro del JSON.

---

# 25. Archivos temporales

El miner generará bastante información temporal:

- repositorios clonados;
- bases CodeQL;
- SARIF;
- logs;
- archivos auxiliares.

Conviene manejar un directorio de trabajo específico:

```text
.miner-work/
```

o utilizar directorios temporales del sistema.

Estos archivos nunca deberán incorporarse a Git.

Una decisión de diseño importante será determinar si:

```text
los temporales se eliminan después del análisis
```

o si existe opcionalmente un modo:

```text
--keep-workspace
```

para depuración.

Para la primera versión puede eliminarse todo al finalizar correctamente.

---

# 26. `.gitignore`

Deberá ignorar al menos conceptualmente:

```text
.venv/
venv/
__pycache__/
.pytest_cache/
.mypy_cache/

.env

.miner-work/
workspace/

*.sarif
*.log

codeql-db/
databases/

repos/

dist/
build/
*.egg-info/
```

El archivo `.env.example`, si existe, sí deberá almacenarse y contener únicamente:

```text
GITHUB_TOKEN=
```

Nunca un token real.

---

# 27. `pyproject.toml`

El proyecto deberá centralizar sus dependencias.

Dependencias principales:

```text
typer
pydantic
requests
```

Dependencias de desarrollo:

```text
pytest
```

Git y CodeQL CLI serán dependencias externas del sistema y deberán documentarse en el README.

También deberá definirse el comando de consola:

```text
miner
```

de forma que, una vez instalado el proyecto, pueda utilizarse:

```text
miner scan ...
```

---

# 28. Estrategia de pruebas

No se debe depender de GitHub real, Git real y CodeQL real para ejecutar constantemente los tests.

La mayoría de los componentes deben poder probarse de forma aislada.

## Pruebas de Pydantic

Verificar:

- creación de hallazgos válidos;
- rechazo de datos inválidos;
- estados permitidos;
- serialización;
- valores opcionales.

## Pruebas del parser SARIF

Utilizar pequeños archivos SARIF de prueba.

Comprobar:

```text
ruleId → rule_id
message → message
uri → file
startLine → start_line
level → severity
```

También comprobar:

- SARIF sin findings;
- campos opcionales ausentes;
- múltiples resultados;
- múltiples reglas;
- rutas complejas.

## Pruebas del orden

Construir resultados deliberadamente desordenados y comprobar que terminen como:

```text
repositorios → orden alfabético

hallazgos →
archivo
línea
rule_id
```

## Pruebas del resumen

Dada una colección de repositorios:

```text
3 analyzed
1 unsupported
2 failed
10 findings
```

verificar que el resumen generado coincida exactamente.

## Pruebas del cliente GitHub

Simular respuestas HTTP.

Especialmente probar paginación:

```text
respuesta página 1
respuesta página 2
respuesta página 3
```

y verificar que el cliente devuelva la unión completa.

## Pruebas de fallos

Simular:

```text
clone error
database creation error
CodeQL analysis error
SARIF inválido
```

y comprobar que el siguiente repositorio continúa siendo procesado.

---

# 29. Uso de mocks

Las pruebas deberán reemplazar componentes externos.

Por ejemplo:

```text
Requests → mock HTTP response

Git → mock process

CodeQL → mock process

Filesystem → tmp_path de pytest
```

Esto permite pruebas:

- rápidas;
- deterministas;
- sin conexión;
- sin consumir límites de GitHub;
- sin tener que ejecutar análisis CodeQL reales.

---

# 30. Pruebas de integración

Además de las pruebas unitarias, conviene tener una cantidad pequeña de pruebas de integración.

Una prueba podría utilizar:

```text
repositorio pequeño de prueba
        ↓
CodeQL real
        ↓
SARIF
        ↓
parser
        ↓
JSON
```

Estas pruebas pueden ejecutarse manualmente o en un entorno preparado.

No deberían ser necesarias para todas las ejecuciones de `pytest`.

---

# 31. README.md

El README deberá contener como mínimo:

## Descripción

Qué hace el miner.

## Requisitos

```text
Python
Git
CodeQL CLI
```

## Instalación

Explicar:

```text
clonar miner
crear entorno
instalar dependencias
```

## Configuración

Explicar:

```text
GITHUB_TOKEN
```

sin proporcionar un token real.

## Ejecución

Mostrar:

```text
miner scan --organization example-org --output results.json
```

## Salida

Explicar brevemente la estructura del JSON.

## Estados

Documentar:

```text
analyzed
unsupported
clone_failed
database_creation_failed
analysis_failed
```

## Seguridad

Advertir explícitamente:

```text
No almacenar tokens en Git.
```

---

# 32. Plan de implementación por etapas

## Fase 1 — Estructura del proyecto

Objetivo:

Crear el esqueleto del proyecto.

Entregables:

- `pyproject.toml`;
- paquetes;
- estructura `src`;
- estructura `tests`;
- `.gitignore`;
- `.env.example`;
- README inicial.

---

## Fase 2 — Modelos Pydantic

Implementar primero:

```text
Finding
RepositoryResult
Summary
OrganizationReport
```

Esto permite establecer tempranamente cuál será el contrato de datos del sistema.

Criterio de aceptación:

Los modelos pueden construir y serializar un ejemplo equivalente al JSON requerido.

---

## Fase 3 — CLI básica

Implementar:

```text
miner scan
--organization
--output
```

Todavía sin realizar análisis.

Criterio de aceptación:

La aplicación acepta argumentos y valida entradas.

---

## Fase 4 — Configuración y token

Implementar lectura segura de:

```text
GITHUB_TOKEN
```

Criterio:

La aplicación falla claramente si el token no existe y jamás imprime su valor.

---

## Fase 5 — GitHub REST API

Implementar:

```text
GitHubClient
```

con:

- autenticación;
- consulta de organización;
- recuperación de repositorios;
- paginación;
- tratamiento de errores HTTP.

Criterio:

Una organización con múltiples páginas produce una sola colección completa.

---

## Fase 6 — Clonación

Implementar el componente Git.

Criterio:

Puede clonar un repositorio en una ubicación proporcionada y devolver éxito o fallo de forma estructurada.

---

## Fase 7 — Detección de lenguaje

Implementar detección de lenguajes analizables.

Criterio:

Cada repositorio queda clasificado como:

```text
analizable
```

o:

```text
unsupported
```

---

## Fase 8 — CodeQL database create

Integrar:

```text
CodeQL CLI
```

para producir bases de datos.

Criterio:

Un repositorio compatible produce una base CodeQL válida.

---

## Fase 9 — CodeQL database analyze

Ejecutar las suites oficiales y generar:

```text
SARIF
```

Criterio:

Cada análisis exitoso genera un archivo SARIF legible.

---

## Fase 10 — Parser SARIF

Transformar SARIF en:

```text
list[Finding]
```

Criterio:

Los datos fundamentales del hallazgo coinciden con los presentes en SARIF.

---

## Fase 11 — Orquestación

Implementar `ScanService`.

Criterio:

Puede ejecutar automáticamente el flujo completo para varios repositorios.

---

## Fase 12 — Manejo de errores

Agregar explícitamente todas las transiciones de estado:

```text
clone_failed
unsupported
database_creation_failed
analysis_failed
```

Criterio:

Un fallo en el repositorio N no evita el procesamiento del repositorio N+1.

---

## Fase 13 — Consolidación JSON

Construir:

```text
OrganizationReport
```

y generar el archivo final.

Criterio:

El JSON:

- es válido;
- es generado desde Pydantic;
- contiene todos los repositorios;
- contiene summary;
- contiene hallazgos;
- contiene estados de error.

---

## Fase 14 — Reproducibilidad

Implementar orden estable.

Criterio:

Ante los mismos datos de entrada, la organización lógica del archivo es idéntica entre ejecuciones.

---

## Fase 15 — Pruebas

Cubrir prioritariamente:

```text
Pydantic
SARIF
paginación
ordenamiento
summary
errores
JSON
```

Criterio:

Las funcionalidades principales pueden verificarse sin GitHub y CodeQL reales.

---

## Fase 16 — Documentación

Completar README y ejemplos.

Criterio:

Una persona que no haya desarrollado el proyecto puede instalarlo y ejecutar:

```text
miner scan --organization example-org --output results.json
```

siguiendo únicamente el README.

---

# 33. Prioridades de desarrollo

El orden recomendado es:

```text
1. Modelos
2. GitHub API
3. Clonación
4. Detección de lenguajes
5. CodeQL
6. SARIF
7. Orquestación
8. JSON
9. CLI completa
10. Manejo avanzado de errores
11. Tests
12. Documentación
```

Es especialmente importante implementar el **modelo de datos antes de integrar CodeQL**, porque de esta manera el parser SARIF tendrá desde el principio un objetivo claramente definido.

---

# 34. Decisiones de diseño recomendadas

## No mezclar CLI con lógica

Typer debe manejar interacción con el usuario, no procesos de análisis.

## No depender directamente de SARIF en todo el proyecto

Solo `SarifParser` debe entender SARIF.

El resto debe trabajar con:

```text
Finding
```

## No dejar que CodeQL invada toda la arquitectura

Solo `CodeQLRunner` debe conocer comandos y opciones específicas de CodeQL.

## No usar diccionarios sin estructura como modelo principal

Utilizar Pydantic permite validar los datos y evita inconsistencias.

## No construir JSON manualmente

El JSON debe ser consecuencia de serializar el modelo raíz.

## No almacenar errores únicamente en logs

Los errores relevantes de cada repositorio deben quedar representados en `RepositoryResult`.

## No ejecutar todos los repositorios en paralelo inicialmente

Primero conseguir una implementación secuencial robusta y reproducible.

---

# 35. Modelo conceptual final

La arquitectura puede resumirse como:

```text
                 ┌────────────────┐
                 │      Typer     │
                 │      CLI       │
                 └───────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   ScanService   │
                └────────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   GitHubClient    RepositoryCloner   LanguageDetector
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  CodeQLRunner
                         │
                         ▼
                       SARIF
                         │
                         ▼
                   SarifParser
                         │
                         ▼
                Pydantic Models
                         │
                         ▼
                   JsonWriter
                         │
                         ▼
                  results.json
```

---

# 36. Criterios de aceptación finales

El proyecto estará terminado cuando se pueda ejecutar:

```text
miner scan --organization example-org --output results.json
```

y se cumpla que:

1. La organización proviene del argumento CLI.
2. El token proviene exclusivamente de `GITHUB_TOKEN`.
3. Se recuperan todos los repositorios, incluyendo los obtenidos mediante paginación.
4. Los repositorios se procesan automáticamente.
5. Cada repositorio se clona independientemente.
6. Se detectan los lenguajes analizables.
7. CodeQL crea las bases de datos correspondientes.
8. Se ejecutan consultas oficiales de seguridad.
9. CodeQL produce SARIF.
10. El SARIF se interpreta y no se entrega directamente.
11. Cada hallazgo se transforma a un modelo Pydantic.
12. Cada repositorio posee un estado explícito.
13. Los errores individuales no interrumpen el proceso completo.
14. Los repositorios aparecen ordenados alfabéticamente.
15. Los hallazgos aparecen en orden estable.
16. Se calcula un resumen global.
17. Todo se consolida en un único JSON válido.
18. El JSON es generado desde modelos Pydantic.
19. La terminal muestra el progreso independientemente del JSON.
20. Existen pruebas pytest para los componentes principales.
21. El proyecto dispone de README, `.gitignore` y `pyproject.toml`.
22. Ninguna credencial, base CodeQL, repositorio clonado ni archivo temporal queda incorporado al repositorio Git.

---

# 37. Hitos recomendados

Una forma práctica de controlar el avance sería dividirlo en cinco hitos:

**Hito 1 — GitHub Miner básico**

```text
CLI → GitHub API → paginación → lista ordenada de repositorios
```

**Hito 2 — Preparación del análisis**

```text
repositorios → clonación → lenguajes → estados
```

**Hito 3 — CodeQL**

```text
repositorio → database create → database analyze → SARIF
```

**Hito 4 — Consolidación**

```text
SARIF → parser → Pydantic → ordenamiento → JSON
```

**Hito 5 — Robustez**

```text
manejo de errores → pytest → documentación → limpieza → pruebas finales
```

Con esta división, cada hito produce una versión funcionalmente comprobable y se evita intentar integrar GitHub, Git, CodeQL, SARIF, Pydantic y Typer al mismo tiempo.