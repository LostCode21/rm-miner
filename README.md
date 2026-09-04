# rm-miner

Esqueleto inicial para recuperar y clonar repositorios de una organizacion de GitHub. Esta version solo realiza listado paginado y clonacion; no ejecuta CodeQL ni genera informes.

## Configuracion

Cree `.env` a partir de `.env.example` y defina la organizacion:

```text
GITHUB_ORGANIZATION=example-org
GITHUB_TOKEN=
```

`GITHUB_TOKEN` es opcional para organizaciones publicas, pero se recomienda para evitar limites bajos de la API y es necesario para organizaciones privadas. No incluya el token en Git.

## Uso

Instale el paquete y sus dependencias de desarrollo:

```bash
python -m pip install -e '.[dev]'
```

Clone todos los repositorios, ordenados por nombre:

```bash
miner clone
```

Limite la cantidad de repositorios o seleccione otro directorio de destino:

```bash
miner clone --limit 5 --workspace workspace
```

Cada clonacion se ejecuta de forma independiente. Si una falla, las restantes continuan.
