# Codex Advisor

The standalone plugin at `plugins/codex-advisor/` packages the `$codex-advisor` skill. It requests `gpt-6.2-astra` at `high` reasoning for a native Codex subagent. Consultation depends on the question. The main agent can request independent scrutiny even when it uses the same model.

The idea was inspired by [RPIV Advisor](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-advisor), which uses a Pi tool. This Codex implementation uses original instructions and native subagent dispatch.

## Install from the public marketplace

```bash
codex plugin marketplace add rxreyn3/codex-plugins --ref main
codex plugin add codex-advisor@ryan-codex
```

After a new release, refresh and reinstall with `codex plugin marketplace upgrade ryan-codex` followed by `codex plugin add codex-advisor@ryan-codex`. Start a fresh Codex task to load the skill.

## Optional local development install

The repository's `scripts/install-dev.sh` installs only the RPIV workflow plugin through `ryan-codex-dev`; it does not install Advisor. Public installations require no local development marketplace. The following separate development route is optional. To install this independent plugin through Codex's personal marketplace, run from the repo root:

```bash
python3 "$HOME/.codex/skills/.system/plugin-creator/scripts/create_basic_plugin.py" codex-advisor --with-skills --with-marketplace
cp -R plugins/codex-advisor/. "$HOME/plugins/codex-advisor/"
python3 "$HOME/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py" "$HOME/plugins/codex-advisor"
codex plugin add codex-advisor@personal
```

The scaffold creates `~/.agents/plugins/marketplace.json` with a `personal` entry pointing to `~/plugins/codex-advisor`. If that entry or destination already exists, inspect it first and update the existing local copy instead of rerunning the scaffold. Validate the source plugin with the plugin-creator `validate_plugin.py`, then start a fresh Codex task after installation to load the skill. The installed plugin is a cached copy; editing this repository alone does not refresh it.

For general proactive use, add the [standing guidance from the README](../README.md#encourage-proactive-use) to your global Codex instructions after installation. It encourages consultation when useful while preserving the skill’s eligibility rules and the main agent’s ownership.

To choose a different advisor, update the model and effort in the source skill and reinstall, or give higher-priority instructions. If the configured settings are unavailable or the host reports a mismatch, the skill reports a dispatch error. Actions requiring advisor approval remain pending.
