# rm-miner

CLI para analizar con CodeQL los repositorios de una organizacion de GitHub y consolidar los hallazgos en JSON.

## Requisitos

- Linux, Python 3.10 o posterior, Git y CodeQL CLI disponibles en `PATH`.
- Un token de GitHub en `GITHUB_TOKEN` para organizaciones privadas o para evitar limites bajos de la API. El token se usa solo para la API; Git debe tener configuradas sus propias credenciales HTTPS para clonar repositorios privados.

## Configuracion e instalacion

```bash
cp .env.example .env
python -m pip install -e '.[dev]'
```

Defina el token en `.env` si lo necesita:

```text
GITHUB_TOKEN=
```

No incluya tokens en Git, logs ni archivos de resultados.

## Uso

```bash
miner scan --organization example-org --output results.json
```

La herramienta obtiene y ordena todos los repositorios de la organizacion, detecta Python, JavaScript/TypeScript y Ruby, y analiza cada lenguaje compatible de forma independiente. Los repositorios y bases CodeQL se almacenan temporalmente y se eliminan al finalizar.

El JSON incluye todos los repositorios, sus estados, lenguajes, hallazgos y un resumen global. Los fallos individuales no interrumpen el procesamiento, pero hacen que el comando termine con codigo 1.

## Pruebas

```bash
python -m pytest
```
