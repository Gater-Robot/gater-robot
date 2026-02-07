# Codex web environment indicators

The following environment variables are available in this Codex web session and can
be used to detect or configure a CODE web environment in setup scripts:

- `CODEX_CI=1` indicates the Codex CI/web runtime environment is active.
- `CODEX_INTERNAL_ORIGINATOR_OVERRIDE=codex_web_agent` identifies the web agent origin.
- `CODEX_HOME=/opt/codex` points to the Codex home directory.
- `CODEX_ENV_*` variables expose language/runtime versions (for example: `CODEX_ENV_NODE_VERSION=22`,
  `CODEX_ENV_PYTHON_VERSION=3.12`, `CODEX_ENV_GO_VERSION=1.24.3`, `CODEX_ENV_RUST_VERSION=1.89.0`).

If you only need a boolean check, `CODEX_CI` plus the `CODEX_INTERNAL_ORIGINATOR_OVERRIDE` value are
reliable environment flags in this session.
