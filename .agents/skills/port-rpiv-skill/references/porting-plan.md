# RPIV-Pi to RPIV-Codex: One-Skill Porting Plan

## Purpose

Port RPIV-Pi to Codex one named skill at a time without redesigning RPIV along the way.

Each invocation performs one bounded cycle:

```text
named RPIV-Pi skill
        |
        v
trace required dependency closure
        |
        v
port behavior with minimal Codex adapters
        |
        v
verify source tree -> commit candidate -> install locally
        |
        v
fresh task tests installed plugin -> user accepts or returns for repair
```

The final arrow is deliberately a separate task. A task that edits or installs a plugin cannot prove that a newly started Codex task will discover and execute the installed copy correctly.

## Fixed source

Use this source revision unless the user explicitly asks to update the pin:

- Repository: sibling checkout `../rpiv-mono`
- Package root: `../rpiv-mono/packages/rpiv-pi`
- Upstream branch at pin time: `upstream/main`
- Commit: `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`
- Commit date: `2026-08-24`
- Commit subject: `Add [Unreleased] section for next cycle`

Resolve both repository paths with `git rev-parse --show-toplevel`; do not rely on the caller's current directory. Before reading the source skill, verify that the RPIV-Pi checkout is clean and `HEAD` equals the pinned commit. If it differs, stop and report the actual revision. Never pull, reset, switch branches, or silently change this pin during a port.

To update the pin later, the user must explicitly request it. Fast-forward the source checkout from its configured upstream, record the new full commit here, validate the orchestration skill, and commit that pin change separately from a skill port.

## Invocation and scope

Accept one simple directory name, for example `discover`, not a path or a comma-separated list. Confirm that `<package-root>/skills/<name>/SKILL.md` exists. Reject `_shared` as the requested skill; it is a dependency namespace, not a user workflow.

The invocation authorizes the bounded cycle for the named skill: source inspection, repository edits, proportionate verification, one local candidate commit, and local plugin installation or refresh. It does not authorize a push, publication, release, source-repository edits, or work on another skill.

Start only from a clean `rpiv-codex` worktree. If it is dirty, classify every change. Continue only when all existing changes are clearly the unfinished candidate for this same named skill and the user asks to resume it. Otherwise stop rather than folding unrelated work into the port.

The allowed change cone is:

1. the target Codex skill;
2. dependency files the target executes or instructs the model to read;
3. shared plugin infrastructure required to package or run those files;
4. tests and concise provenance documentation for this target;
5. local marketplace metadata and the plugin version needed to install this candidate.

Do not port predecessor or successor skills merely because the source names them. Preserve their names, artifact links, and handoff text so they can be ported later.

## Phase 1: Trace the source dependency closure

Read the source `SKILL.md` fully. Then recursively inspect only items reachable from it:

- relative Markdown links and explicitly named reference files;
- scripts, templates, schemas, fixtures, and assets;
- `_shared` material it imports or tells the model to read;
- agent definitions it dispatches and whether their isolation is semantic or merely organizational;
- extension tools, hooks, commands, or runtime data it invokes;
- artifact inputs, outputs, frontmatter, directories, and downstream handoffs;
- path-bearing output surfaces: conversational evidence, artifact prose, parser-consumed structural fields, and raw agent output that a parent skill must normalize;
- package code needed to understand observable behavior of an extension call.

For every dependency, record a compact working table with these columns:

| Source item | Why the skill needs it | Codex disposition | Destination |
|---|---|---|---|
| path or capability | execution or instruction edge | copy, mechanical conversion, adapter, defer, or block | target path |

`Defer` is valid only for a successor feature that the named skill does not need to complete. `Block` means the named skill cannot honestly work without a missing Codex capability; ask the user before changing semantics.

For every Pi `Agent` edge, record the role's required tools, whether separate execution is part of the observable contract, and the behavior when native collaboration agents are unavailable. Do not infer semantic isolation merely because the source happens to use an agent as its execution carrier.

Do not inventory the whole monorepo. Stop following an edge when it does not affect the named skill's inputs, user-visible choices, execution, artifact, or handoff. The dependency closure is a reachability problem, not an invitation to develop opinions about every file in the package.

Before editing, summarize:

- source skill and pinned revision;
- required closure;
- Pi-specific capabilities and their Codex mappings;
- genuine gaps or semantic choices;
- proposed target files and verification.

Proceed without another ceremony when the mapping is mechanical and within this contract. Ask one focused question when a choice changes user-visible behavior, artifact compatibility, or the stage boundary.

## Phase 2: Apply the porting rules

### Preserve before improving

Preserve these source properties unless Codex makes one impossible:

- user-visible workflow order and decision points;
- meanings of Run, Edit, Omit, Stop, Accept, Revise, and similar choices;
- artifact directories, filenames, frontmatter, templates, and cross-stage references;
- required agent roles and the information returned by them;
- validation conditions and stop behavior;
- explicit non-goals and successor-stage boundaries.

Copy compatible prose, templates, and deterministic scripts. Make mechanical syntax changes where Pi and Codex differ. Add the smallest adapter that supplies missing mechanics. Do not add approval envelopes, hashes, graders, ledgers, schemas, generalized frameworks, or new workflow stages unless the source requires them or a concrete failing test demonstrates the need.

Name the Codex skill `rpivc-<source-name>` unless an already accepted port establishes a different compatible convention.

### Represent file references by output surface

Apply this adapter only when the named skill emits or consumes file or artifact references. Preserve the source citation's meaning: use a repository-relative path and a verified starting line or range when one exists. Adapt its representation to the surface instead of mechanically rewriting every path-shaped string.

| Output surface | RPIV-Codex representation | Constraints |
|---|---|---|
| Conversational evidence | A repository-relative Markdown link such as `[Billing handler — line 42](backend/path/to/file.py#L42)` or `[Billing handler — lines 42–55](backend/path/to/file.py#L42-L55)`. | Use a descriptive label that names the file or subject and line or range. Keep the target repository-relative, use a GitHub-style line fragment, and do not add a machine-specific absolute companion link. |
| Human-readable artifact prose | The same repository-relative Markdown-link form used in conversation. When no verified line exists, link the repository-relative path without a fragment. | Keep the target free of absolute machine paths and render the link as ordinary Markdown, never inside a fenced code block. |
| Parser-consumed structural field | The plain repository-relative path or other literal shape required by the source contract. | Do not turn frontmatter, filenames, section identifiers, `files:` values, or another skill's load-bearing path fields into links. |
| Raw converted-agent output | Whatever citation form the role naturally returns, normalized by the parent skill before presentation or artifact writing. | Treat role output as evidence input, not as the final rendering contract. |

Classify each path-bearing field before converting it. This adapter changes presentation, not artifact schema, evidence precision, or downstream handoff semantics. If the source or a downstream parser requires a conflicting literal representation, preserve that contract and document the Codex difference rather than guessing.

### Capability mapping

Use the capability available in the current Codex environment, not a guessed tool name:

| RPIV-Pi dependency | Codex mapping |
|---|---|
| Read, search, list, and shell operations | Native repository inspection and terminal tools; prefer `rg` and `rg --files` for search |
| `ask_user_question` | Native structured user-input tool when available; otherwise ask one concise question in the response and stop |
| Pi `Agent` dispatch | Native Codex collaboration agent when available; otherwise bounded inline execution when role separation is organizational rather than semantic |
| Pi agent definition | Convert to a portable Markdown role prompt shipped inside the target skill; do not depend on target-project `.codex/agents` files |
| Todo or workflow progress | Native plan/progress mechanism when available; otherwise concise commentary checkpoints |
| Web search or fetch extension | Native Codex web or browser capability when available; otherwise report the missing evidence capability and stop rather than fabricating results |
| Pi extension with deterministic local behavior | Reuse a standalone script when possible; otherwise port only the behavior the named skill calls |
| Pi session hook or global runtime mutation | Replace with explicit skill instructions or a local helper when behavior is reproducible; block when hidden lifecycle behavior is essential |

Classify every converted agent dependency before implementing it:

- **Semantic isolation** means separate context, independence, competing judgments, or role identity is necessary to trust the output. If collaboration agents are unavailable, report the limitation and stop rather than simulating independence inline.
- **Organizational delegation** means the agent only bounds context, parallelizes work, or applies a specialist search or analysis prompt whose output the parent verifies. Bundle the role prompt and define a bounded inline fallback using the same task, tool, search, file-read, and output limits. Use the fallback only when the main task exposes the required capabilities.

When native collaboration is available, the target skill must read the bundled role prompt and include its operational instructions in the agent task. Use a built-in Codex agent type that exists in the installed environment. Whether delegated or inline, normalize the role result at the parent boundary. Do not make ordinary installed use depend on a capability that the target Codex task may omit unless semantic isolation genuinely makes that capability a compatibility requirement.

Trace an inline or reduced-capability result through its next parser, grouper, checkpoint, or artifact gate. A fallback is incomplete when its honest empty-repository, missing-code, or external-evidence output is rejected by an unchanged live-code requirement downstream. Adapt the smallest downstream contract that can preserve the source workflow, or stop at the real missing capability.

### Package dependencies where they execute

The installed plugin must be self-contained:

- Put dependencies used by one skill inside that skill's directory.
- Put genuinely reused runtime files under a documented shared directory in `plugins/rpiv-codex/` only after a second accepted port needs them.
- Do not reach back into `../rpiv-mono`, the `rpiv-codex` source checkout, a personal Codex skill directory, or a target project's `.codex/agents` during installed execution.
- Resolve helper paths from the installed skill or plugin location, not from the caller's working directory.

On the first port, create the minimum documented Codex plugin structure:

```text
.agents/plugins/marketplace.json
plugins/rpiv-codex/
  .codex-plugin/plugin.json
  skills/
    rpivc-<source-name>/
      SKILL.md
      references/   # only when needed
      scripts/      # only when needed
```

Follow the official Codex plugin manifest and local-marketplace formats. Use the installed `plugin-creator` skill for marketplace metadata, version cache-busting, and reinstall mechanics rather than preserving commands from memory.

## Phase 3: Verify the candidate

Verification must be proportional and source-aligned. Use only the checks below that apply to behavior the named skill actually has:

1. **Skill validity:** validate each new or changed `SKILL.md` with the available Codex skill validator.
2. **Codex packaging:** parse plugin and marketplace manifests, verify declared and linked paths exist, and reject runtime references to the source checkout, repository-local orchestration skill, personal skill directories, or target-project `.codex/agents`.
3. **Source-equivalent executable behavior:** port or adapt focused upstream tests for each copied or changed helper script. Do not strengthen the source contract accidentally. Add a Codex-specific case only when installation changes path resolution or another observable runtime boundary.
4. **Artifact contracts:** when the source declares a downstream artifact shape, check only load-bearing frontmatter, required sections, filenames, and compatibility fields. Do not snapshot template prose.
5. **File-reference adapters:** when the skill has path-bearing output, check the representation boundary: the same repository-relative Markdown links in conversation and artifact prose, plain structural fields, and no machine-specific absolute paths. A demonstrated installed-use defect justifies a narrow static contract check when no deterministic renderer exists. Prefer checking a template or role output shape when available; do not duplicate whole instruction paragraphs across per-skill tests.
6. **Conditional capability fallbacks:** when a concrete installed failure shows that an optional Codex capability may be absent, check the load-bearing fallback or stop branch without snapshotting the whole prompt. Confirm that the next consumer accepts the fallback's honest output shape. A narrow static contract check is acceptable when the branch is instruction-driven. Do not add duplicate installed runs for every capability combination unless the states are controllable and the semantic risk requires them.
7. **Workflow structure:** statically check only a small number of load-bearing order or stop boundaries that cannot be inferred from the file layout. Do not assert generated wording, headings, or agent-role prose merely because it appears in `SKILL.md`; add a wording regression only when the source already carries an equivalent check or a demonstrated defect requires one.
8. **Change provenance:** review the diff against the dependency table. Every added runtime file must have a source edge or a documented Codex adapter reason.

Create generic manifest, link, and forbidden-reference checks once at plugin level and reuse them as later skills arrive. Do not reproduce the same packaging test body per skill.

Do not require argument, artifact, failure, stop, or unrelated-working-directory tests from a skill that lacks the corresponding behavior. Do not build a general evaluation harness, Promptfoo suite, semantic grader panel, repeated stochastic run, or per-skill coverage matrix by default. Add model evaluation only when a concrete installed failure or unresolved high-consequence semantic difference cannot be distinguished by a single realistic run. Retain failing evidence and repair the same skill; a historical pass does not cancel a current failure.

Report verified facts separately from behavior that still requires the installed-plugin test.

## Phase 4: Commit and install the candidate

Before committing:

- show the exact files to be committed;
- confirm tests pass;
- confirm no unrelated changes are staged;
- confirm the plugin version and marketplace entry identify this candidate.

Create one candidate commit with the subject:

```text
Port <source-name> from RPIV-Pi
```

Do not amend an accepted prior skill's commit. If installed testing exposes a defect, make a focused repair commit for the same skill.

After the commit, use the `plugin-creator` skill's current local development installation flow. Install or refresh from the repository's local marketplace. Do not publish or push. Record:

- candidate commit;
- plugin manifest version;
- installed cache path or installation identifier;
- validation commands and outcomes;
- exact fresh-task test prompts.

## Phase 5: Hand off to a fresh installed-plugin test

End the porting task with a self-contained test card. Tell the user to start a new Codex task in an unrelated project with the locally installed plugin enabled. By default, use two prompt executions:

1. **Realistic path:** one explicit invocation such as `$rpivc-<source-name> ...` that exercises the named skill's ported dependencies and observable output end to end.
2. **Boundary:** one cheap no-argument, invalid-input, stop, or non-trigger case chosen from the source skill's actual boundary behavior.

Before those executions, confirm that Codex loaded the installed cache copy rather than files from the `rpiv-codex` checkout. During them, confirm execution does not rely on `rpiv-mono`, `rpiv-codex`, personal skill files, or target-project `.codex/agents`; these are observations, not extra prompt cases.

When the named skill emits file references, use the same realistic execution to inspect one representative single-line link, one range link when the output naturally contains a range, and one artifact link. Confirm each human-facing target remains repository-relative and any downstream structural path remains literal. Do not add separate prompt executions for these observations.

When the named skill conditionally delegates to collaboration agents, record whether that capability is available during the realistic execution and which path ran. After a concrete unavailable-agent failure, the repaired realistic case must exercise the bounded fallback or the honest semantic-isolation stop; it does not need an additional prompt execution.

Add a separate natural-language invocation only when implicit discovery is intentionally supported and materially needs verification. Do not multiply prompts to test the same path, and do not repeat a passing stochastic run unless its result is ambiguous or a concrete failure is being isolated.

The fresh task returns either:

- **Pass**: evidence for every required case, followed by explicit user acceptance; or
- **Repair**: the exact failing prompt, observed behavior, expected source behavior, and installed candidate identity.

Only **Pass** plus user acceptance makes the named skill done. A committed and installed candidate is still a candidate. Do not begin another skill in the test task.

For the next cycle, start another fresh task in `rpiv-codex` and invoke this orchestration skill with one new name, for example:

```text
Discover is accepted. Use $port-rpiv-skill research.
```

The new task must independently verify the repository state, accepted predecessor files, and pinned RPIV-Pi revision. It must not trust a prose claim when the checkout disagrees.

## Completion report

End every porting task with:

- named skill and source pin;
- dependency closure actually ported;
- Codex substitutions and any known differences;
- candidate commit and plugin version;
- source-tree validation results;
- installed-plugin status;
- fresh-task test card or accepted test evidence;
- explicit statement that no successor skill, push, or publication occurred.

Keep candidate, installed, tested, accepted, and published as distinct states. Software has enough ambiguous adjectives already.

## Codex format references

- Repository skill layout and invocation: <https://learn.chatgpt.com/docs/build-skills>
- Plugin structure and local marketplace: <https://developers.openai.com/plugins/build/plugins>
- Local installation and complete-plugin testing: <https://developers.openai.com/plugins/deploy/connect-chatgpt>
