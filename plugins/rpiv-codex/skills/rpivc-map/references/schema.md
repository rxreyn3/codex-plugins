# Companion schema and helper contract

The companion is the only editable factual model. Version 1 is a JSON object;
unknown fields are rejected so misspellings cannot silently disappear. Strings
are plain text, never markup. Identifiers use letters, digits, `_` and `-`.
All arrays below are required unless marked optional; empty arrays are valid.
The helper validates structure and references, not whether prose is true.

```text
schemaVersion: 1
id, title, revision: nonempty strings (id and revision are identifiers)
origin, currentStage: explore | research | design | plan | blueprint | implementation
owner: { artifact: string|null, authority: none|research|design|plan, reason: string }
sources: [{ id, title, kind, availability: available|unavailable,
            revision?: string, checkedAt?: ISO timestamp, url?: https/http URL,
            path?: string, note?: string }]
layers: [{ id, title }]
boundaries?: [{ id, title, external: boolean }]
components: [{ id, name, responsibility, kind: interface|process|store|reference,
               layerId, boundaryId?: id, claims, sourceIds: [source id] }]
connections: [{ id, from: component id, to: component id, label, payload,
                trigger: string|null, triggerUnknown?: string,
                kind: data|trigger|dependency|reference,
                implementation: existing|draft|undesigned,
                claims, sourceIds: [source id], assumption?: string }]
constraints?: [{ id, text, componentIds: [id], sourceIds: [id], gap?: string }]
questions: [{ id, title, componentId, componentIds?: [id], connectionIds?: [id],
              status: open|resolved, action: engineering|coordination|user,
              agreed, needs, why, nextStep, example?: string,
              sourceIds: [id], gap?: string, decisionRecordId?: source id,
              candidates?: [{ id, title, consequence, feasibility,
                              tradeoffs, sourceIds: [id], gap?: string }],
              recommendation?: { candidateId, reason, sourceIds: [id] } }]
work: [{ id, title, description, kind: outcome|check,
         status: remaining|deferred|done, componentIds: [id],
         connectionIds?: [id], sourceIds: [id], gap?: string }]
journeys: [{ id, title, description, componentIds: [id], connectionIds: [id] }]
tickets: [{ id, title, url?: https/http URL, description, sourceIds: [id],
            scope: [{ componentId, portion, sourceIds: [id], gap?: string }],
            connectionIds: [id],
            dependencies: [{ componentId, relationship: prerequisite|related,
                             reason, enables, sourceIds: [id], gap?: string }] }]
suggestion?: null | { title, questionId, enables, rationale,
                      dependencies: [{ componentId, relationship: hard|helpful,
                                       reason, sourceIds: [id], gap?: string }],
                      sourceIds: [id] }
refresh: { baselineRevision: id|null,
           changes: [{ id, text, dimension: scope|implementation|evidence|ownership|dependency|question|work,
                       componentIds: [id], questionIds?: [id], workIds?: [id],
                       sourceIds: [id], gap?: string,
                       before?: string, after?: string }] }
reviews: [{ id, reviewer, result: approved|changes-requested,
            reviewedAt: ISO timestamp, revision, notes }]
```

Every component and connection has `claims` with three independent arrays:
`{scope: [claim], implementation: [claim], evidence: [claim]}`. Each array must
contain at least one claim. A claim is `{id, text, state, sourceIds: [id], gap?:
string}`. Claim identifiers are unique across the companion. State is a precise
plain-text qualification, for example `agreed`, `unresolved`, `source inspected`,
or `not checked`; it is not a combined completion scale. A claim needs an
available source or an explicit `gap`. Unsupported scope claims must have state
`unresolved`. A source must record its revision or checked time, including when
unavailable; `note` explains unavailable evidence. Sources with `kind: decision`
can describe user-message provenance in `note`; no fabricated URL is needed.

Connection evidence requires an available source or `assumption`, which is
displayed plainly. A missing trigger requires `trigger: null` and an explicit
`triggerUnknown`. Reference connections are contextual and are never journey
steps. A `reference` component cannot participate in runtime connections.
Dependencies do not establish scope. Ticket scope rows need their own evidence
or gap; a gap remains explicitly unresolved. Question `agreed` explains settled
behavior; `needs` describes the unresolved mechanism or check. Candidate
approaches remain expandable. Recommendations require a candidate and available
supporting evidence; an engineering prerequisite alone is not a recommendation.
Resolved questions require a decision record. A user question requires at least
two investigated candidates with available feasibility evidence and consequences.

The renderer draws layers as responsibility columns. Shapes distinguish
interfaces, processing and saved data. Boundaries explicitly group external
providers. Paths route through the space around the columns, with numbered
inspectable connections; selection does not rearrange parts.

## Commands

Run with Node.js; no package installation is needed:

```sh
node <skill>/scripts/map.mjs validate <companion.json>
node <skill>/scripts/map.mjs render <companion.json> --output <candidate.html> [--approval <approval.json>]
node <skill>/scripts/map.mjs verify <companion.json> <candidate.html>
node <skill>/scripts/map.mjs refresh <candidate.json> --approval <approval.json>
node <skill>/scripts/map.mjs record-review <companion.json> <candidate.html> --output <review.json> --reviewer 'Codex Advisor' --result approved --notes 'Actual review findings and resolutions'
node <skill>/scripts/map.mjs approve <companion.json> <candidate.html> --review <review.json> --approval <approval.json>
```

`render` writes only a candidate file. If an approval record exists, supply it;
the helper refuses to overwrite any file recorded as approved. It also refuses
an existing output unless `--replace-candidate` is supplied. `verify` checks the
exact model embedded in the export, its companion digest, and deterministic
rendered output. The browser uses that same embedded model for every factual
panel; it has no network writes, decision-saving controls or source mutations.
Only HTTP and HTTPS source links are clickable; local paths are readable text.

`record-review` records a review already performed; it does not perform one or
grant permission. It checks model/render parity and binds the review to their
exact SHA-256 digests. Record requested/effective advisor settings and the
desktop/mobile views actually inspected in notes. Companion `reviews` is
historical context. Final approval lives in a separate record to avoid a file
claiming to hash itself. `approve` requires an approved exact-digest review and
matching baseline, then stores immutable companion, rendering and review
snapshots beside the approval record before atomically replacing that record.
It never replaces earlier snapshots. `refresh` validates the candidate against
the last approved snapshot and prints the changes; it does not advance approval.

Initial maps use `baselineRevision: null`. Later candidates must name the last
approved revision, preserve map identity, origin, established component identities
and settled scope claims unless an evidenced change explicitly explains the
revision. A changed owning artifact or stage needs an ownership change record.
Changing source provenance or availability also needs a refresh record that
names that source and covers every affected component in the previous and
candidate models. This includes references inside claims, connection endpoints,
question candidates, recommendations and decision records, work, ticket scope
and dependency rows, constraints, and suggestions. A changed source can support
an implementation, question or other appropriate change; an evidence-only
record is not required. Records about unrelated parts cannot cover its impact.
An unavailable source must have an available supporting record or an explicit
gap on the refresh entry; that gap establishes missing coverage, not behavior.
Changing only `checkedAt` does not require manufactured progress. A newly added,
unavailable source with no affected component may likewise remain a coverage
gap without a meaningful-change entry.

Layer or boundary additions, removals, titles, external-provider flags, changed
layer order and component group assignments need a sourced `dependency` or
`implementation` refresh entry covering the affected components. An unused
group needs a sourced map-level entry with empty `componentIds`. These checks
preserve responsibility meaning and positions; they do not establish that code
was built. Changing only a component's `sourceIds` needs a sourced `evidence`
entry for that component. A source or grouping record may cover several actual
changes when its explanation and evidence support all of them.

Unavailable evidence and unchanged refreshes stay explicit. The helper can catch
missing records and altered identifiers; human review must check whether each
source really supports the claimed change. A failed render, check or review
leaves the last approval and its snapshots untouched. Keep the approval record
and snapshots together when moving the map.
