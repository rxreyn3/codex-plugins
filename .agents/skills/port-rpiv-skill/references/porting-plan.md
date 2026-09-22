# RPIV-Pi to RPIV-Codex: One-Skill Porting Plan

## Purpose

Port or selectively update RPIV-Pi in Codex one named skill at a time without redesigning RPIV along the way.

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
classify result -> commit when required -> install behavioral candidates
        |
        v
fresh task tests installed plugin -> user accepts or returns for repair
```

The final arrow applies only to a behavioral candidate and is deliberately a separate task. A task that edits or installs a plugin cannot prove that a newly started Codex task will discover and execute the installed copy correctly.

## Fixed source

Ordinary mode uses this source revision:

- Repository: sibling Git repository `../rpiv-mono`
- Package tree: `packages/rpiv-pi`
- Upstream branch at pin time: `upstream/main`
- Commit: `0fdf4f813980d380e826b84d1280a4960e5d088e`
- Commit date: `2026-09-13`
- Commit subject: `Add [Unreleased] section for next cycle`

Resolve the `rpiv-codex` root and its sibling `rpiv-mono` repository through `git rev-parse --show-toplevel`; do not rely on the caller's current directory or accept an arbitrary lookalike directory. Treat the source working tree and its `HEAD` as irrelevant. Read committed source only with revision-qualified Git object operations such as `git cat-file`, `git show`, `git ls-tree`, `git log`, and `git diff` against the resolved source repository. Never pull, switch, checkout, reset, merge, clean, or write files in the `rpiv-mono` working tree.

Before ordinary-mode inspection, test the exact pinned object with `git cat-file -e <pin>^{commit}`. When it exists, do not fetch. When it is absent, run `git fetch upstream main`; stop on fetch failure, then test the exact pinned object again and stop if it remains unavailable. Never substitute source `HEAD`, a local branch, or a cached remote-tracking revision.

`--latest` is the only pin-refresh mode:

1. Require a clean `rpiv-codex` worktree. If an unfinished candidate exists, stop before fetching and explain that it must be resumed through ordinary pinned mode.
2. Run `git fetch upstream main` in the resolved source repository and stop on any failure. Do not fall back to a cached reference.
3. Only after that successful fetch, resolve `refs/remotes/upstream/main` to one full commit and freeze that commit for the entire invocation.
4. If the frozen commit equals the recorded pin, create no pin commit. If the recorded pin is an ancestor, update only the fixed commit, date, and subject above, validate this orchestration skill, and commit the metadata separately with subject `Update RPIV-Pi source pin`. If neither is an ancestor of the other, stop for divergence without changing the pin. Never rewind the pin.
5. Continue the named skill against the frozen commit. A later fetch or reference movement cannot change the selected source for this invocation.

## Invocation and scope

Parse one simple directory name, for example `discover`, plus at most one trailing `--latest`. Reject no name, more than one name, paths, comma-separated lists, duplicate modifiers, unknown modifiers, and `_shared`. Confirm the named source skill with `git cat-file -e <selected>:packages/rpiv-pi/skills/<name>/SKILL.md`; do not use a working-tree existence check.

The invocation authorizes the bounded cycle for the named skill: source inspection, repository edits, proportionate verification, an applicable local commit, and installation or refresh only for a behavioral candidate. It does not authorize a push, publication, release, source-repository edits, or work on another skill.

Start only from a clean `rpiv-codex` worktree. In ordinary pinned mode only, continue when every existing change is clearly the unfinished candidate for this same named skill and the user asks to resume it. Otherwise stop rather than folding unrelated work into the port. `--latest` has no resume exception because fetching and possibly moving the global pin under a candidate would make its source identity ambiguous.

If `plugins/rpiv-codex/skills/rpivc-<name>` is absent, use the initial-port flow. If it exists, use the selective-update flow. Do not overwrite an existing target as though it were a new port.

The allowed change cone is:

1. the target Codex skill;
2. dependency files the target executes or instructs the model to read;
3. shared plugin infrastructure required to package or run those files;
4. tests and concise provenance documentation for this target;
5. tests and development-install mechanics needed to install this candidate without changing the tracked public version.

Do not port predecessor or successor skills merely because the source names them. Preserve their names, artifact links, and handoff text so they can be ported later.

## Phase 1: Trace the source dependency closure

Read the source `SKILL.md` fully with `git show <selected>:packages/rpiv-pi/skills/<name>/SKILL.md`. Then recursively inspect only items reachable from it, always at an explicit source revision:

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

Trace orchestration assumptions as dependencies too. If source completion relies on an outer dispatcher to schedule sibling phases or stages, map that dispatcher to the actual Codex carrier. When no dispatcher exists, a completed named unit must hand off to the next unit in declared order; suggest final validation only when no implementation unit remains. Preserve the stop boundary: a handoff names the next command but never invokes it.

Map abstract decision labels to concrete installed workflow stages. When the current stage cannot own a required mutation and the evidence leaves exactly one valid successor, recommend that successor with its specific input instead of asking a choice whose other outcomes cannot proceed honestly. Retain a developer choice gate when multiple valid in-stage consequences remain. In both cases, stop rather than invoking the successor automatically.

Do not let an implementation unit's ownership boundary leak into a plan-owning revision stage. When feedback establishes a factual invariant that may repeat in the same artifact—such as an unavailable executable, command convention, path, dependency, or environment assumption—the revision stage must scan the complete plan for analogous occurrences before proposing edits. Surface every same-correction occurrence under one approval gate; do not silently broaden into a general plan audit or edit anything not listed in the approved proposal.

Do not inventory the whole monorepo. Stop following an edge when it does not affect the named skill's inputs, user-visible choices, execution, artifact, or handoff. The dependency closure is a reachability problem, not an invitation to develop opinions about every file in the package.

For an initial port, trace the selected upstream closure. For an update, trace the union of the old-upstream, selected-upstream, and current-Codex dependency closures. A dependency removed upstream can still explain retained local behavior; a dependency added upstream can change the target even when the top-level skill barely moved.

## Phase 1A: Establish update lineage and review scope

For an existing target, establish these distinct baselines before proposing edits:

- **Original upstream baseline:** the upstream commit represented by the implementation that survives at `HEAD`. Find the Codex commit that introduced that surviving implementation, following verified renames or moves. Inspect deletion and recreation as a possible origin reset. Stop when the origin is absent or remains ambiguous.
- **Per-skill review baseline:** the upstream commit through which all reachable changes for this named skill were last assessed. `Reviewed through` means assessed, not necessarily adopted, installed, tested, or accepted. It is not the global source pin.

Find the newest commit reachable from `HEAD` whose subject exactly equals `Update <source-name> from RPIV-Pi`. Validate its required `Upstream review` and `Codex lineage` body fields and the tracked provenance before using its new review endpoint. Repair commits do not replace this record. No prior exact-subject update commit is valid only for the first selective update, whose review baseline is the original upstream baseline.

The old review baseline in the next update commit is that validated per-skill baseline, and the new review baseline is the selected pin frozen for this invocation.

Require the original baseline, review baseline, and selected pin to be full available commits in the source repository. Require the review baseline to be an ancestor of the selected pin. Stop for absent, ambiguous, unavailable, or non-ancestor baselines; do not guess from dates, source `HEAD`, global pin history, or similar-looking commit subjects.

Review all three comparisons:

1. review-baseline upstream to selected-pin upstream, for newly reachable source changes;
2. review-baseline upstream to the implementation and history surviving in Codex, for local intent and prior adaptations;
3. every outstanding deferral recorded by the prior update, even when the selected pin equals the review baseline.

Classify each relevant upstream change as `adopt`, `adapt`, `retain-local`, or `defer`, with a reason. These upstream-change dispositions are separate from the dependency table's copy, conversion, adapter, defer, or block dispositions. `retain-local` is valid when current Codex behavior remains intentionally better suited to Codex or preserves an accepted contract. `defer` requires a documented consequence, must remain in the complete outstanding list, and must be reconsidered on every later update.

Before editing, require one focused user decision when a conflict would consequentially change user-visible behavior, artifact compatibility, or a stage boundary. Do not bundle unrelated choices or convert a deliberate local difference into an automatic upstream overwrite.

Before editing, summarize:

- source skill and pinned revision;
- required closure;
- Pi-specific capabilities and their Codex mappings;
- genuine gaps or semantic choices;
- proposed target files and verification.

For an update, also summarize the original baseline, review baseline, surviving Codex origin, three-way comparison, carried deferrals, and proposed dispositions.

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

Apply this adapter only when the named skill emits or consumes file or artifact references. Preserve the source citation's repository identity and verified starting line or range when one exists. Adapt its representation to the surface instead of mechanically rewriting every path-shaped string.

| Output surface | RPIV-Codex representation | Constraints |
|---|---|---|
| Codex Desktop chat and completion reports | An absolute Markdown target resolved against the caller's Git root, ending in the verified starting line: `[Billing handler — lines 42–55](/absolute/repository/backend/path/to/file.py:42)`. | Keep ranges only in labels. When no line is verified, link the absolute path without a suffix. Wrap targets containing spaces in angle brackets. |
| Other chat clients | The representation required by the active host and repository instructions. | Do not assume that either the Codex Desktop or GitHub link form will navigate. |
| Human-readable artifact prose | A repository-relative Markdown link such as `[Billing handler — line 42](backend/path/to/file.py#L42)` or `[Billing handler — lines 42–55](backend/path/to/file.py#L42-L55)`. When no verified line exists, link the repository-relative path without a fragment. | Keep the artifact free of absolute machine paths and render the link as ordinary Markdown, never inside a fenced code block. |
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

## Phase 3: Record provenance and classify the outcome

On the first selective update, add durable tracked provenance for the original baseline and review status. Preserve it on later updates:

```text
Original upstream baseline: <hash>.
Reviewed through RPIV-Pi commit <hash>; selected Codex differences remain.
```

If that wording or its placement might affect execution or user-visible behavior, treat the edit as behavioral rather than provenance-only.

Every selective-update commit uses the exact subject:

```text
Update <source-name> from RPIV-Pi
```

Its body must contain:

```text
Upstream review: <old-review-baseline>..<new-review-baseline>
Codex lineage: <surviving-origin-commit>

Dispositions:
- <source path or capability at revision>: adopt|adapt|retain-local|defer — <reason>

Outstanding deferrals:
- None.
```

Replace `None` with the complete unresolved list when any deferral remains. Carry prior unresolved items forward and reconsider them even when the pin has not advanced.

Classify exactly one outcome:

1. **Behavioral candidate:** runtime instructions, scripts, templates, dependencies, packaging, or installed behavior beyond provenance-only text changed. Run focused verification, development installation, and fresh-task acceptance.
2. **Record-only update:** no behavioral condition applies, but a baseline, disposition, deferral, or provenance record changed. Run relevant source-tree validation and create the update commit. When tracked files are byte-identical, use an explicitly empty provenance commit with the required subject and body. Do not reinstall or repeat acceptance.
3. **No-change review:** behavior and every baseline, disposition, deferral, and provenance record remain unchanged. Report the completed review without a commit, installation, or acceptance run.

## Phase 4: Verify the candidate

Verification must be proportional and source-aligned. Use only the checks below that apply to behavior the named skill actually has:

1. **Skill validity:** validate each new or changed `SKILL.md` with the available Codex skill validator.
2. **Codex packaging:** parse plugin and marketplace manifests, verify declared and linked paths exist, and reject runtime references to the source checkout, repository-local orchestration skill, personal skill directories, or target-project `.codex/agents`.
3. **Source-equivalent executable behavior:** port or adapt focused upstream tests for each copied or changed helper script. Do not strengthen the source contract accidentally. Add a Codex-specific case only when installation changes path resolution or another observable runtime boundary.
4. **Artifact contracts:** when the source declares a downstream artifact shape, check only load-bearing frontmatter, required sections, filenames, and compatibility fields. Do not snapshot template prose.
5. **File-reference adapters:** when the skill has path-bearing output, check each representation boundary separately: Codex Desktop chat uses absolute targets with start-line suffixes, other chat clients follow their active host contract, artifact prose remains repository-relative, structural fields remain plain, and artifacts contain no machine-specific absolute paths. A demonstrated installed-use defect justifies a narrow static contract check when no deterministic renderer exists. Prefer checking a template or role output shape when available; do not duplicate whole instruction paragraphs across per-skill tests.
6. **Conditional capability fallbacks:** when a concrete installed failure shows that an optional Codex capability may be absent, check the load-bearing fallback or stop branch without snapshotting the whole prompt. Confirm that the next consumer accepts the fallback's honest output shape. A narrow static contract check is acceptable when the branch is instruction-driven. Do not add duplicate installed runs for every capability combination unless the states are controllable and the semantic risk requires them.
7. **Workflow structure:** statically check only a small number of load-bearing order or stop boundaries that cannot be inferred from the file layout. Do not assert generated wording, headings, or agent-role prose merely because it appears in `SKILL.md`; add a wording regression only when the source already carries an equivalent check or a demonstrated defect requires one.
8. **Change provenance:** review the diff against the dependency table. Every added runtime file must have a source edge or a documented Codex adapter reason.

Create generic manifest, link, and forbidden-reference checks once at plugin level and reuse them as later skills arrive. Do not reproduce the same packaging test body per skill.

Do not require argument, artifact, failure, stop, or unrelated-working-directory tests from a skill that lacks the corresponding behavior. Do not build a general evaluation harness, Promptfoo suite, semantic grader panel, repeated stochastic run, or per-skill coverage matrix by default. Add model evaluation only when a concrete installed failure or unresolved high-consequence semantic difference cannot be distinguished by a single realistic run. Retain failing evidence and repair the same skill; a historical pass does not cancel a current failure.

Report verified facts separately from behavior that still requires the installed-plugin test.

## Phase 5: Commit and install when required

Before committing:

- show the exact files to be committed;
- confirm tests pass;
- confirm no unrelated changes are staged;
- confirm the tracked public plugin version is unchanged and the development installer will identify this candidate with an ignored cache-busted copy.

For an initial port, create one candidate commit with the subject:

```text
Port <source-name> from RPIV-Pi
```

For an update, use the exact update subject and body from Phase 3. Do not amend an accepted prior skill's commit. If installed testing exposes a defect, make a focused repair commit for the same skill; that repair does not become the review-baseline record.

After a behavioral-candidate commit, run `scripts/install-dev.sh`. It builds an ignored development marketplace copy, applies the cache-buster only to that copy, installs it, and byte-verifies the installed cache. Do not install for a record-only or no-change outcome. Do not change the tracked public manifest version for a candidate, and do not publish or push. Record:

- candidate commit;
- development-copy plugin version;
- installed cache path or installation identifier;
- validation commands and outcomes;
- exact fresh-task test prompts.

## Phase 6: Hand off behavioral candidates to a fresh installed-plugin test

For a behavioral candidate, end the porting task with a self-contained test card. Tell the user to start a new Codex task in an unrelated project with the locally installed plugin enabled. By default, use two prompt executions:

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
- initial-port or update mode, its baselines, surviving origin when applicable, dispositions, and outstanding deferrals;
- dependency closure actually ported;
- Codex substitutions and any known differences;
- outcome classification and commit, if any;
- development-copy plugin version for a behavioral candidate;
- source-tree validation results;
- installed-plugin status for a behavioral candidate;
- fresh-task test card or accepted test evidence for a behavioral candidate;
- explicit statement that no successor skill, push, or publication occurred.

Keep candidate, installed, tested, accepted, and published as distinct states. Software has enough ambiguous adjectives already.

## Codex format references

- Repository skill layout and invocation: <https://learn.chatgpt.com/docs/build-skills>
- Plugin structure and local marketplace: <https://developers.openai.com/plugins/build/plugins>
- Local installation and complete-plugin testing: <https://developers.openai.com/plugins/deploy/connect-chatgpt>
