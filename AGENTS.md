# rm-miner Agent Guide

## Commands

- Install the editable package and test dependency with `python -m pip install -e '.[dev]'`.
- Run all tests with `python -m pytest`; run one test with `python -m pytest tests/test_cloner.py::test_clone_returns_failure_without_raising`.
- The `miner` console command is registered as `miner.cli:main`; use `miner clone [--limit N] [--workspace PATH]` after installation.

## Structure and behavior

- `src/miner/cli.py` wires the `clone` command: configuration, GitHub pagination, then per-repository cloning. Keep API access in `github/client.py` and local Git operations in `repository/cloner.py`.
- `.env` is loaded only when the CLI runs, from the current working directory. It requires `GITHUB_ORGANIZATION` and never overrides already-exported environment variables.
- `GITHUB_TOKEN` authenticates GitHub API requests only; HTTPS cloning uses the local Git credential configuration. Clones are shallow (`git clone --depth 1`) into `workspace/<repository-name>`.
- Cloning deliberately continues after individual failures and returns exit code 1 if any repository failed. An existing destination is treated as a failure, not reused or overwritten.

## Tests

- Tests are isolated with `pytest` monkeypatches: mock `client.session.get` for GitHub requests and `miner.repository.cloner.subprocess.run` for Git. Do not make unit tests call the network or run real clones.
