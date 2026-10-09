# Procedencia de las evidencias

- Release de código asociado: `v1.0.0` (`1c54c3908f22b025ca7a68fccf936656aad489fc`).
- Commit usado para generar las evidencias: `0b0ed57ba5abf6d05800bed7f58607040f534513`.
- Fecha de generación: `2026-10-09T05:30:49Z`.

Las evidencias se generaron antes del commit final que actualizó la versión del
proyecto de `0.1.0` a `1.0.0`. La comparación entre el commit de ejecución y el
tag `v1.0.0` solo presenta cambios de versión en los siguientes archivos:

- `pyproject.toml`
- `uv.lock`
- `visualizer/package.json`
- `visualizer/package-lock.json`

No existen cambios en la implementación de Miner, Analyzer o Reporter entre
ambos commits. Se conserva el commit de ejecución original en
`execution-info.md` para no atribuir la corrida a un código distinto del que la
produjo.
