# Informe de Requerimientos  
## Miner de Vulnerabilidades para Organizaciones GitHub

### 1. Objetivo

Desarrollar una herramienta de línea de comandos en Python que automatice el análisis de seguridad de los repositorios pertenecientes a una organización de GitHub mediante CodeQL.

La herramienta deberá obtener los repositorios desde GitHub, clonarlos, ejecutar análisis de seguridad y consolidar los hallazgos en un único archivo JSON estructurado y reproducible.

---

## 2. Alcance

El sistema deberá implementar el siguiente flujo:

**Organización GitHub → GitHub REST API → Repositorios → Clonación → CodeQL → SARIF → Pydantic → JSON consolidado**

El procesamiento deberá realizarse de manera independiente por repositorio, de modo que el fallo de uno de ellos no detenga el análisis completo de la organización.

---

## 3. Requerimientos funcionales

### RF-01. Interfaz de línea de comandos

La aplicación deberá implementarse utilizando **Typer**.

Deberá permitir al menos:

```text
miner scan --organization ORGANIZACION --output ARCHIVO.json
```

La organización analizada deberá recibirse como parámetro y no podrá estar definida directamente en el código.

### RF-02. Autenticación GitHub

La aplicación deberá obtener el token de autenticación desde la variable de entorno:

```text
GITHUB_TOKEN
```

El token no deberá almacenarse en el código fuente, archivos de configuración versionados ni documentación.

### RF-03. Obtención de repositorios

La aplicación deberá consultar la **GitHub REST API** para obtener todos los repositorios disponibles de la organización indicada.

La implementación deberá soportar paginación.

### RF-04. Clonación

Cada repositorio recuperado deberá ser clonado en un directorio local de trabajo.

Un fallo de clonación deberá registrarse y no deberá detener el procesamiento de los demás repositorios.

### RF-05. Detección de lenguajes

La aplicación deberá identificar los lenguajes presentes en cada repositorio y determinar cuáles pueden ser analizados mediante CodeQL.

Los repositorios sin lenguajes compatibles deberán marcarse como no soportados.

### RF-06. Análisis con CodeQL

El sistema deberá utilizar **CodeQL CLI** para:

1. crear la base de datos CodeQL;
2. ejecutar consultas oficiales de seguridad;
3. generar resultados en formato SARIF.

No será necesario desarrollar consultas CodeQL personalizadas.

### RF-07. Procesamiento SARIF

Los archivos SARIF generados por CodeQL deberán ser interpretados por la aplicación.

El SARIF será únicamente un formato intermedio y no constituirá la salida final del sistema.

### RF-08. Hallazgos

Cada hallazgo deberá registrar, cuando la información esté disponible:

- identificador de la regla CodeQL;
- severidad;
- mensaje;
- archivo afectado;
- línea inicial;
- lenguaje asociado.

### RF-09. Modelado de datos

Las estructuras de datos deberán implementarse utilizando **Pydantic**.

Como mínimo deberán existir modelos para:

- hallazgos;
- resultados de repositorios;
- resumen global;
- resultado de la organización.

### RF-10. Generación de JSON

La aplicación deberá producir un único archivo JSON válido con los resultados consolidados de toda la organización.

El JSON deberá generarse mediante serialización de modelos Pydantic y no mediante concatenación manual de cadenas.

### RF-11. Resumen global

El resultado deberá incluir al menos:

- organización analizada;
- número total de repositorios;
- número de repositorios analizados;
- número de repositorios fallidos;
- número de repositorios no soportados;
- número total de hallazgos.

### RF-12. Manejo de errores

El sistema deberá distinguir al menos los siguientes estados:

- `analyzed`;
- `clone_failed`;
- `unsupported`;
- `database_creation_failed`;
- `analysis_failed`.

El fallo de un repositorio individual no deberá detener el análisis global.

### RF-13. Progreso de ejecución

La aplicación deberá mostrar por terminal:

- repositorio actualmente procesado;
- etapa en ejecución;
- resultado del análisis;
- errores relevantes.

La salida de terminal deberá mantenerse separada del contenido del archivo JSON.

---

## 4. Requerimientos no funcionales

### RNF-01. Modularidad

El proyecto deberá implementarse como una aplicación Python estructurada en módulos separados.

Deberán separarse, como mínimo, las responsabilidades de:

- GitHub API;
- clonación;
- detección de lenguajes;
- ejecución de CodeQL;
- procesamiento SARIF;
- modelos Pydantic;
- generación JSON;
- CLI.

### RNF-02. Reproducibilidad

Los repositorios deberán ordenarse alfabéticamente.

Los hallazgos deberán utilizar un orden estable, por ejemplo:

```text
archivo → línea → regla CodeQL
```

Dos ejecuciones sobre el mismo estado de una organización deberán producir la misma organización lógica de los resultados.

### RNF-03. Seguridad

Las credenciales no deberán registrarse en:

- logs;
- JSON;
- código;
- repositorio Git;
- archivos de ejemplo.

### RNF-04. Mantenibilidad

La lógica de GitHub, Git, CodeQL y SARIF deberá estar encapsulada para facilitar pruebas, mantenimiento y futuras extensiones.

### RNF-05. Compatibilidad

La herramienta deberá ejecutarse en un entorno Linux con:

- Python;
- Git;
- CodeQL CLI;
- acceso a la API de GitHub.

---

## 5. Tecnologías requeridas

El proyecto deberá utilizar:

- **Python**;
- **GitHub REST API**;
- **Requests**;
- **Git**;
- **CodeQL CLI**;
- **Typer**;
- **Pydantic**;
- **pytest**;
- **venv o uv**;
- **pyproject.toml**.

---

## 6. Pruebas

El proyecto deberá incluir pruebas automatizadas con **pytest**.

Las pruebas deberán cubrir prioritariamente:

- validación de modelos Pydantic;
- interpretación de archivos SARIF;
- paginación de GitHub;
- generación del resumen;
- ordenamiento reproducible;
- manejo de errores;
- generación del JSON final.

Las pruebas unitarias no deberán depender obligatoriamente de repositorios reales ni de ejecuciones reales de CodeQL.

---

## 7. Archivos requeridos

El repositorio del proyecto deberá incluir al menos:

```text
pyproject.toml
README.md
.gitignore
.env.example
src/
tests/
```

El archivo `.env.example` deberá contener únicamente:

```text
GITHUB_TOKEN=
```

---

## 8. Exclusiones

No forma parte del alcance inicial:

- desarrollar consultas CodeQL personalizadas;
- modificar repositorios analizados;
- corregir automáticamente vulnerabilidades;
- subir resultados a GitHub;
- ejecutar análisis obligatoriamente en paralelo;
- almacenar permanentemente repositorios clonados o bases de datos CodeQL.

---

## 9. Criterios de aceptación

La solución será considerada conforme cuando permita ejecutar:

```text
miner scan --organization example-org --output results.json
```

y produzca un archivo JSON válido que:

- contenga todos los repositorios obtenidos desde GitHub;
- indique el estado de cada repositorio;
- incluya los lenguajes analizados;
- registre los hallazgos de CodeQL;
- consolide estadísticas generales;
- mantenga un orden reproducible;
- continúe funcionando aunque algunos repositorios fallen;
- no exponga el token de GitHub.

---

## 10. Resultado esperado

El producto final será un **miner automatizado de vulnerabilidades**, capaz de transformar un análisis manual de CodeQL en un proceso sistemático aplicable a múltiples repositorios de una organización GitHub.

La salida principal será un archivo JSON estructurado, validado y reproducible que represente de forma uniforme el resultado de los análisis realizados.