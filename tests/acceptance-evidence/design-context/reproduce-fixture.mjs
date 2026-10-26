import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Reproduce the synthetic measurement input; initialize Git separately, without a commit.
if (process.argv.length !== 3) throw new Error("Usage: node reproduce-fixture.mjs <new-project-root>");
const root = resolve(process.argv[2]);
const files = {
  ".rpiv/artifacts/research/input.md": "---\nstatus: ready\ntopic: Delivery diagnostics\n---\n# Delivery diagnostics research\n## Summary\nDesign a diagnostic counter around the existing delivery path. Preserve request content, transport error identity, and existing retry counts. No external service or new persisted schema.\n## Code References\n- [Delivery implementation](src/send.js): complete shared module including configuration.\n- [Request controller](src/controller.js).\n- [Background retry consumer](src/job.js).\n- [Existing verification surface](src/send.test.js).\n## Integration Points\nRequest controller and background job call send. Configuration is loaded from the environment by the controller.\n## Architecture Insights\nDiagnostics must not change retries, failure behavior, or the disabled-delivery path.\n## Precedents & Lessons\nThis disposable fixture has no committed Git history.\n## Developer Context\nSettled: diagnostics remain internal; request payloads must not be logged. Do not re-ask either choice.\n## Open Questions\nDecide diagnostic placement after the research roles verify current behavior.\n",
  "src/controller.js": "import { send, readDeliveryConfig } from \"./send.js\";\nexport const deliver = (request, transport, env) => send(request, transport, readDeliveryConfig(env));\n",
  "src/job.js": "import { send } from \"./send.js\";\nexport const retryJob = (request, transport) => send(request, transport, { attempts: 2 });\n",
  "src/send.test.js": "import { send } from \"./send.js\";\n// Existing test surface checks one transient failure then successful delivery.\nexport const scenario = () => send({}, async () => \"sent\", { attempts: 2 });\n"
};
const lines = ["export const defaultAttempts = 1;", "export async function send(request, transport, config = {}) {", "  if (config.enabled === false) throw new Error(\"delivery disabled\");", "  const attempts = config.attempts ?? defaultAttempts;", "  for (let attempt = 0; attempt < attempts; attempt += 1) {", "    try { return await transport(request); }", "    catch (error) { if (!error.transient || attempt + 1 === attempts) throw error; }", "  }", "  throw new Error(\"attempt count must be positive\");", "}"];
for (let index = 1; index <= 700; index += 1) {
  lines.push(`// Historical delivery note ${String(index).padStart(4, "0")}: preserve transport error identity when extending this module; this comment declares no runtime behavior.`);
}
lines.push(...["export function readDeliveryConfig(env) {", "  return { enabled: env.DELIVERY_ENABLED !== \"false\", attempts: Number(env.DELIVERY_ATTEMPTS ?? 1) };", "}"]);
files["src/send.js"] = `${lines.join("\n")}\n`;
for (const [relativePath, content] of Object.entries(files)) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { flag: "wx" });
}
