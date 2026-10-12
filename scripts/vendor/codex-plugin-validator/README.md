# Pinned Codex plugin validator

Unmodified validator and identifier helper from [openai/codex at 985cf47a4eb6084b2ff6b30ebdb1216acda85bb4](https://github.com/openai/codex/tree/985cf47a4eb6084b2ff6b30ebdb1216acda85bb4/codex-rs/skills/src/assets/samples/plugin-creator/scripts).

OpenAI [removed the bundled plugin-creator skill](https://github.com/openai/codex/commit/9db8162d658100bbf0a5a151996f9c3396ff1791); its parent above is the last official snapshot before removal. Keeping these files here makes `scripts/validate-plugin.sh` independent of the caller's Codex system-skill installation. Validation does not download source or modify installed plugins.

Original paths:

- `codex-rs/skills/src/assets/samples/plugin-creator/scripts/validate_plugin.py`
- `codex-rs/skills/src/assets/samples/plugin-creator/scripts/identifier_validation.py`

- `validate_plugin.py`: SHA-256 `f4eeadb733b28b0c3e714de263a76d6542866a672f3e99bdffcf4dbcdf85e944`.
- `identifier_validation.py`: SHA-256 `a6d51ce4a9a7e8f85626ff5808a467a67574e7f8cdf1167ffb467c5f67e57223`.

The included Apache-2.0 license applies to these files. Python 3.9 or newer and PyYAML are required; the repository runner supplies PyYAML through `uv`.

This snapshot checks the repository's existing `.codex-plugin/plugin.json`, skill frontmatter, agent metadata and declared assets. It is not a validator for every current portable plugin feature, hosted submission, skill behavior or installed runtime. In particular, this upstream snapshot permits a missing or empty skills directory and does not validate references inside skill prose; the repository packaging tests provide those checks. Continue running them alongside it. Do not weaken or patch the vendor files to accommodate new formats; review a replacement separately if the package format changes.
