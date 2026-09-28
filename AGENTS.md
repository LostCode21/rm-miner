# rm-miner Agent Guide

## Commands

- Install the editable package and test dependency with `python -m pip install -e '.[dev]'`.
- Run all tests with `python -m pytest`; run one test with `python -m pytest tests/test_cloner.py::test_clone_returns_failure_without_raising`.
- The `miner` console command is registered as `miner.cli:main`; use `miner scan --organization ORG --output PATH [--workspace PATH]` or `miner sbom --organization ORG --workspace PATH --output PATH` after installation.

## Structure and behavior

- `src/miner/cli.py` wires the `scan` and `sbom` commands. Keep API access in `github/client.py` and local Git operations in `repository/cloner.py`.
- `.env` is loaded only when `scan` runs, from the current working directory, and never overrides already-exported environment variables.
- `GITHUB_TOKEN` authenticates GitHub API requests only; HTTPS cloning uses the local Git credential configuration. Clones are shallow (`git clone --depth 1`) into `workspace/<repository-name>`. `scan` defaults to `.miner-work/` in the current directory.
- Cloning deliberately continues after individual failures and returns exit code 1 if any repository failed. Existing Git repositories are reused; an existing non-Git destination is a failure.

## Tests

- Tests are isolated with `pytest` monkeypatches: mock `client.session.get` for GitHub requests and `miner.repository.cloner.subprocess.run` for Git. Do not make unit tests call the network or run real clones.
