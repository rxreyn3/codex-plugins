---
name: port-rpiv-skill
description: Port exactly one named RPIV-Pi skill and the missing transitive files it needs into the RPIV-Codex plugin in this repository. Use from rpiv-codex when asked to port, adapt, implement, commit, install, or locally test one RPIV-Pi skill such as discover or research. Require one source skill name, preserve source behavior and artifact compatibility, and never advance to another skill automatically.
---

# Port One RPIV Skill

Read `references/porting-plan.md` completely before inspecting source files, editing the repository, committing, or installing the plugin.

Invoke this skill with exactly one RPIV-Pi skill name:

```text
$port-rpiv-skill discover
```

Treat the named skill as the only workflow stage in scope. Include only its missing transitive dependencies: referenced scripts, templates, agent definitions, shared instructions, and runtime behavior that the named skill actually needs. A successor skill mentioned in prose is not a dependency.

If the invocation has no skill name or names more than one skill, ask for one name and stop. If a source dependency forces a product or compatibility choice that the plan does not resolve, explain the choice and ask one focused question. Do not improvise a new RPIV workflow.

Follow every checkpoint and completion rule in the porting plan. In particular:

- preserve the RPIV-Pi outcome and interaction model;
- translate Pi-specific mechanics to the closest native Codex capability;
- keep installed-plugin execution independent of the `rpiv-codex` checkout and target-project `.codex/agents` files;
- keep testing source-aligned: executable behavior inherited from RPIV-Pi, minimal Codex packaging checks, and one realistic installed run plus one cheap boundary case by default;
- do not turn prompt wording into a test interface or create a general evaluation harness without a concrete failure that needs one;
- commit only the completed candidate for the named skill;
- never push, publish, or start the next skill;
- call the port complete only after a fresh task tests the installed plugin and the user accepts the result.
