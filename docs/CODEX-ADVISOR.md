# Codex Advisor

The standalone plugin lives at `plugins/codex-advisor/`. Its manifest packages one skill, `$codex-advisor`; it does not alter the RPIV workflow plugin. The skill uses native Codex subagents and their normal tools. Its default advisor is `gpt-6-astra` at `high` reasoning. Automatic consultation is eligible for a known current `gpt-6-sol` or `gpt-6-luna` working model at any effort; a current `gpt-6-astra` working model is skipped.

The idea was inspired by [RPIV Advisor](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-advisor), which uses a Pi tool. This Codex implementation uses original instructions and native subagent dispatch.

## Local install

The repo's `scripts/install-dev.sh` installs only the RPIV workflow plugin. To install this independent plugin through Codex's personal marketplace, run from the repo root:

```bash
python3 "$HOME/.codex/skills/.system/plugin-creator/scripts/create_basic_plugin.py" codex-advisor --with-skills --with-marketplace
cp -R plugins/codex-advisor/. "$HOME/plugins/codex-advisor/"
python3 "$HOME/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py" "$HOME/plugins/codex-advisor"
codex plugin add codex-advisor@personal
```

The scaffold creates `~/.agents/plugins/marketplace.json` with a `personal` entry pointing to `~/plugins/codex-advisor`. If that entry or destination already exists, inspect it first and update the existing local copy instead of rerunning the scaffold. Validate the source plugin with the plugin-creator `validate_plugin.py`, then start a fresh Codex task after installation to load the skill. The installed plugin is a cached copy; editing this repository alone does not refresh it.

For general proactive use, add this paragraph to the user's global Codex instructions after installation:

> When a consequential decision remains ambiguous after inspection, repeated approaches fail, or credible evidence conflicts, consider `$codex-advisor`. Follow the skill's automatic policy using only a verified current working-model identity or my explicit declaration of it for this task. A manual request for an advisor bypasses that policy. Give the advice serious evidence-based consideration, share the useful conclusion briefly, and continue the original task.

To choose a different advisor, update the model and effort in the source skill and reinstall, or give higher-priority instructions. A changed advisor configuration disables automatic consultation until an explicit eligible working-model list is also set. A fresh task is needed to pick up installed skill changes. If Codex does not expose the current working model to the agent, a user can declare it for the current task; the skill cannot independently detect later model changes. A request to use Astra as the advisor does not declare the working model.
