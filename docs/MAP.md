# Optional system maps

`rpivc-map` helps find unresolved decisions and agreed work remaining in an existing system investigation. It reads an explicit artifact or a bounded exploration question, creates a JSON companion, and renders an interactive HTML map. The owning RPIV artifact remains authoritative. A map does not approve architecture, record business decisions, implement the system or advance a stage.

One map can evolve through discovery/Explore, Research, Design and either Plan or Blueprint. A design decision can resolve a question while implementation and checks remain unfinished. The expandable refresh summary compares against the last approved map, not a failed candidate.

## Try the skill

In a fresh Codex chat with the development plugin loaded, select **RPIV Map** and supply an artifact:

```text
$rpivc-map Map .rpiv/artifacts/research/<your-research>.md so I can find what still needs deciding or building. Keep this local.
```

Or start earlier:

```text
$rpivc-map Explore how this repository exports a saved document. Inspect only the export entry point, file writer and caller. Show assumptions and unanswered questions; no product changes.
```

Refresh by providing the existing companion, its approval record and changed source artifact. The helper checks the baseline; the agent checks that sources support the actual changes. Decisions discussed using the map must be recorded through the owning RPIV workflow before refreshing.

Final map completion requires companion validation, actual browser interaction and visual inspection, and Codex Advisor approval of the exact final result. If a tool or advisor is unavailable, the result remains a draft. Hosting is optional and requires authorization.

## Portable example

The synthetic document-export fixture under `tests/fixtures/map/` has explicitly fictional source artifacts. It exercises a smaller system without embedding private company evidence in the plugin. Voice acceptance output is kept outside the tracked repository.

From the repository root, render a draft:

```bash
node plugins/rpiv-codex/skills/rpivc-map/scripts/map.mjs validate tests/fixtures/map/export-research.json
node plugins/rpiv-codex/skills/rpivc-map/scripts/map.mjs render tests/fixtures/map/export-research.json --output /tmp/document-export-map.html
node plugins/rpiv-codex/skills/rpivc-map/scripts/map.mjs verify tests/fixtures/map/export-research.json /tmp/document-export-map.html
```

Open the resulting file in a browser. Choose a journey or work item, then **Review remaining questions**. Inspect a question, a component and a connection: the journey/work-item context should remain selected. **Show everything connected to this** deliberately changes that view; returning restores it. On mobile, **Choose another part** returns focus to the grouped picker before the detail panel.

The map separates Still to decide, Agreed work remaining, What we agreed, What exists and What we checked. Technical candidates are possibilities, and a recommendation is not an agreement. No controls save decisions or make provider requests.

## Validation and local development

```bash
scripts/test.sh map
scripts/test.sh
scripts/validate-plugin.sh
```

The [companion contract](../plugins/rpiv-codex/skills/rpivc-map/references/schema.md) documents rendering, exact-data verification and review/approval commands. Recording a review is only bookkeeping after an actual review. Do not manufacture one to make a command pass. The approval helper retains immutable snapshots and updates the approved pointer only after validating the review and baseline.

Follow the [development workflow](DEVELOPMENT.md) to install a candidate. The local installer copies this checkout into an ignored local marketplace and byte-verifies the installed copy. Subsequent source edits need another install; it is not a live filesystem link. To avoid duplicate RPIV skills during local-only testing, verify the development installation before removing `rpiv-codex@ryan-codex`. Leave the shared GitHub marketplace and Codex Advisor installed.

Start a fresh chat after installation. A successful command/configuration check establishes installation; it does not prove the fresh chat discovered the skill or completed a real mapping request. Report those checks separately.
