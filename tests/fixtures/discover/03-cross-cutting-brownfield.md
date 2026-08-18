# Manual discovery fixture: cross-cutting brownfield change

## Paste this prompt into the Codex editor

Paste only this block into a fresh task:

```text
$rpivc-discover Add request correlation identifiers from ingress through background work.
```

## Answers to give only when asked

Do not paste this section into the editor. Use the closest matching answer when discovery asks; do not volunteer later answers early.

- Target context: This is a brownfield parity scenario, not a request to change rpiv-codex. No live product repository is available in this conversation-only run.
- Problem and user: Operators cannot connect an incoming request to its queued job and logs during incident diagnosis.
- Success: One identifier follows the request, job payload, worker logs, and returned error context.
- Scope: Generate at ingress when absent, preserve a valid caller value, and propagate through the existing queue boundary.
- Non-goal: No distributed tracing vendor, log-platform migration, or retroactive identifiers.
- Constraint: Do not expose sensitive request data; preserve existing job compatibility during deployment.
- Shape preference: Prefer the existing context and serialization mechanisms if the probe confirms them.
- Acceptance: A focused integration test proves the same identifier at ingress and worker; malformed caller values are replaced; old queued jobs still run.
- Explicit deferrals: Retention policy for correlation identifiers in analytics is deferred because analytics is outside this feature.
