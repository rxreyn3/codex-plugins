# Discovery agent card templates

Display only cards justified by a live repository question. Zero cards means no probe. Replace every placeholder with information known before the conversational gate.

## Locator card

```yaml
id: "{{CARD_ID}}"
dispatch_protocol: rpivc-dispatch/v1
task_name: "{{LOWERCASE_CARD_ID}}_codebase_locator"
role: rpivc-codebase-locator
purpose: "{{BOUNDED_WHERE_QUESTION}}"
prompt: "{{EXACT_INTENT_SHAPED_PROMPT}}"
inputs: ["captured-intent", "{{KNOWN_TARGET_REPOSITORY_OR_NAMED_PATHS}}"]
repository: "{{ABSOLUTE_TARGET_REPOSITORY}}"
branch: "{{CURRENT_BRANCH}}"
commit: "{{CURRENT_COMMIT}}"
working_tree_sha256: "{{CURRENT_WORKING_TREE_SHA256}}"
model: gpt-5.6-luna
reasoning: low
sandbox_request: read-only
sandbox_enforcement: "inherited-parent; project-agent configuration does not guarantee child-specific isolation"
behavioral_permissions: [read, search, git-read]
intended_tools: [read, search, git-read]
child_agents: forbidden
budget: {max_files: 10, max_findings: 12}
expected_evidence: "Ranked repository-relative file:line locations"
output_schema: "Primary Anchors; Secondary Locations; Tests; Documentation; Search Gaps"
stop_when: "Relevant locations are ranked, 10 distinct repository files have been surfaced, or evidence is unavailable; do not open or report an 11th file"
```

## Analyzer card

Use only when all anchors in `inputs` already exist. If the anchors will come from a locator, display this card later after the locator finishes.

```yaml
id: "{{CARD_ID}}"
dispatch_protocol: rpivc-dispatch/v1
task_name: "{{LOWERCASE_CARD_ID}}_codebase_analyzer"
role: rpivc-codebase-analyzer
purpose: "{{BOUNDED_HOW_QUESTION}}"
prompt: "{{EXACT_INTENT_AND_ANCHOR_SHAPED_PROMPT}}"
inputs: ["captured-intent", "{{KNOWN_REPOSITORY_RELATIVE_PATH_LINE_ANCHORS}}"]
repository: "{{ABSOLUTE_TARGET_REPOSITORY}}"
branch: "{{CURRENT_BRANCH}}"
commit: "{{CURRENT_COMMIT}}"
working_tree_sha256: "{{CURRENT_WORKING_TREE_SHA256}}"
model: gpt-5.6-terra
reasoning: high
sandbox_request: read-only
sandbox_enforcement: "inherited-parent; project-agent configuration does not guarantee child-specific isolation"
behavioral_permissions: [read, search, git-read]
intended_tools: [read, search, git-read]
child_agents: forbidden
budget: {max_files: 5, max_findings: 12}
expected_evidence: "Repository-relative file:line behavioral trace"
output_schema: "Entry Points; Execution Flow; Data and State; Configuration and Errors; Unknowns"
stop_when: "The named behavior is traced, the five-file boundary is reached, or evidence is unavailable"
```
