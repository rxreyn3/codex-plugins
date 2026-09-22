---
name: port-rpiv-skill
description: Initially port or selectively update exactly one named RPIV-Pi skill and the transitive files it needs in the RPIV-Codex plugin. Use from rpiv-codex for one-skill ports, later upstream reviews, candidate commits, local installation, or acceptance preparation. Supports the recorded source pin or an explicit --latest refresh without mutating the RPIV-Pi checkout.
---

# Port One RPIV Skill

Read `references/porting-plan.md` completely before inspecting source files, editing the repository, committing, or installing the plugin.

Invoke this skill with exactly one RPIV-Pi skill name, optionally followed by `--latest`:

```text
$port-rpiv-skill discover
$port-rpiv-skill discover --latest
```

Treat the named skill as the only workflow stage in scope. Include only its missing transitive dependencies: referenced scripts, templates, agent definitions, shared instructions, and runtime behavior that the named skill actually needs. A successor skill mentioned in prose is not a dependency.

Reject a missing or second skill name, `_shared`, a path instead of a simple name, duplicate modifiers, and any modifier other than `--latest`. Ordinary mode uses the recorded fixed pin. `--latest` must successfully fetch `upstream/main`, may advance the fixed pin in its own commit, and still handles only the named skill. If a source dependency forces a product or compatibility choice that the plan does not resolve, explain the choice and ask one focused question. Do not improvise a new RPIV workflow.

Follow every checkpoint and completion rule in the porting plan. In particular:

- preserve the RPIV-Pi outcome and interaction model;
- inspect committed source with revision-qualified Git object commands without changing the RPIV-Pi working tree;
- translate Pi-specific mechanics to the closest native Codex capability;
- keep installed-plugin execution independent of the `rpiv-codex` checkout and target-project `.codex/agents` files;
- keep testing source-aligned: executable behavior inherited from RPIV-Pi, minimal Codex packaging checks, and one realistic installed run plus one cheap boundary case by default;
- do not turn prompt wording into a test interface or create a general evaluation harness without a concrete failure that needs one;
- keep the global source pin separate from each skill's original and reviewed-through upstream baselines;
- commit only the completed result for the named skill, following the plan's behavioral, record-only, and no-change outcomes;
- never push, publish, or start the next skill;
- call a behavioral port or update accepted only after a fresh task tests the installed plugin and the user accepts the result.
