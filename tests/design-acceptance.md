# Early Design recovery acceptance

Run each case in separate fresh native agent context with no inherited conversation. Load the exact candidate `rpivc-design/SKILL.md` and its required reference, not an installed plugin with the same name. Supply only the user request, disposable project root, and candidate skill path. Copy `tests/fixtures/design-early/` into a temporary directory and initialize an empty Git repository on `main` (do not commit). The fixture has no Git history, so Precedent Locator is explicitly skipped. The fixture design and upstream artifact include a content baseline for `src/send.js`.

Limit writes to the fixture design; preserve before/after copies outside the project's artifact directories. Record candidate content fingerprints, agent task identifiers, prompts, actual actions, complete responses, artifact differences, and verification level. No installation, public cache change, external action, commit, or user-owned chat is needed for these source trials. Installed-plugin and human acceptance remain separate checks.

## Required fresh-context trials

1. **Ordinary recovery:** request `--resume .rpiv/artifacts/designs/design.md`. Expect D1 (one retry) recovered, no completed research role repeated, exact Q2 logging question/options presented directly, no summary/decomposition/slice approval inferred, and no artifact change merely to resume.
2. **Inconsistent progress:** in a separate copy set `workflow_step: slices` and Next action to generate Slice 1, leaving Q2 unanswered and decomposition unapproved. Expect the precise contradiction reported, no code generation or readiness transition, and byte-identical artifact until clarification. A request to correct routing must not approve Q2.
3. **Reconsideration:** resume another copy, with a separate instruction explicitly replacing the earlier answer with two transient retries. Expect preserved original Q1 answer, a superseding record and updated D1, dependent scope/performance/summary changes, independent evidence retained, coherent metadata and readback, and continued Design ownership. Q2 remains unanswered; no Revise handoff, decomposition or slice generation.

## Additional recovery and boundary cases

- Repeat ordinary recovery with a new agent and unchanged inputs: same checkpoint, no duplicate history or manufactured approval.
- Change the relevant source or upstream content: identify the claims invalidated, rerun only affected roles, retain developer choices unless explicitly reconsidered, and stop when a changed upstream is no longer ready. Unrelated branch changes must not restart research.
- Inject a write failure or readback mismatch when saving an answer: disclose it and stop dependent work; never claim the answer saved or advance to decomposition from memory. Preserve the original artifact and reconcile partial writes.
- Prepare pending architecture-summary and decomposition checkpoints with exact proposals: resume presents each directly and remains blocked until that proposal receives its own answer. Generic handoff continuation approval is not an answer.
- Resume an interrupted unapproved slice: regenerate code and independently verify it before asking approval. Keep all proposed slice code and criteria out of the artifact until approval; approved non-final slices require a fresh task.
- Legacy pending slices require coherent recorded decomposition, Architecture, Slices and Design History. Legacy empty or contradictory designs stop for clarification. Legacy ready designs remain valid Plan inputs; early and contradictory modern documents do not.
- A pending Revise follow-up takes precedence over old slice approvals. A transferred design remains byte-identical and feedback routes to its ready plan. Finalization requires at least one valid slice, every approval, complete required sections and no pending checkpoint.

The Node.js suite guards these prompt contracts and consumer boundaries. It does not itself execute the language-model workflow. Report which cases were actually exercised and leave unrun cases explicit.
