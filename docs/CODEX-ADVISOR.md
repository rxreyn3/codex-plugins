# Codex Advisor

The standalone plugin lives at `plugins/codex-advisor/`. Its manifest packages one skill, `$codex-advisor`; it does not alter the RPIV workflow plugin. The skill uses native Codex subagents and their normal tools. Its default advisor is `gpt-6-astra` at `high` reasoning. After a consultation trigger is established, automatic consultation is permitted for a verified working model different from the configured advisor, including future model names. For the same model, it is permitted only at verified lower reasoning effort; equal or higher effort is excluded. Unknown model identity or an uncertain same-model effort comparison skips automatic consultation. Explicit user requests bypass those eligibility exclusions.

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

To choose a different advisor, update the model and effort in the source skill and reinstall, or give higher-priority instructions. The same exclusion policy follows the configured advisor; there is no model allowlist to maintain. An invalid, unavailable, or unsupported advisor configuration produces a visible consultation error without a silent substitute. Independent work can continue, but actions requiring advisor approval remain pending. A fresh task is needed to pick up installed skill changes. If Codex does not expose the current working model to the agent, a user can declare it for the current task; the skill cannot independently detect later model changes. A request to use Astra as the advisor does not declare the working model.
