import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Synthetic source material for fresh-context trials; never a saved agent result.
export function createFixture(destination) {
  mkdirSync(destination, { recursive: true });
  const fixtures = dirname(dirname(fileURLToPath(import.meta.url)));
  cpSync(join(fixtures, "design-early", "src"), join(destination, "src"), { recursive: true });
  const research = join(destination, ".rpiv/artifacts/research");
  mkdirSync(research, { recursive: true });
  const lines = [
    "---", "status: ready", "topic: Bounded retry", "---",
    "# Synthetic retry research", "Preserve the injected transport and send entry point.",
    "At most two transient retries; permanent errors must never retry.",
    "## Code References",
    "- [send entry point](src/send.js)",
    "- [inspection requirements](src/inspection.js)",
    "## Developer Context",
    "Q1: How many transient retries? Answer: One retry. This is an inherited decision.",
    "Q2: Who owns failure logging? Answer: The caller; send must not add logging.",
  ];
  lines.push("## Cancellation", "Retry delay must be cancellable by the caller.");
  lines.push("## Logging", "Final requirement: do not log request bodies or transport credentials.");
  writeFileSync(join(research, "input.md"), `${lines.join("\n")}\n`);
  const source = ["// Synthetic inspection source; runtime behavior remains unverified."];
  for (let index = 1; index <= 700; index += 1) {
    source.push(`export const observation${index} = ${index}; // Independent synthetic declaration.`);
    if (index === 350) source.push("export const cancellationOwner = 'caller';");
  }
  source.push("export const forbiddenLogFields = ['requestBody', 'transportCredentials'];");
  writeFileSync(join(destination, "src/inspection.js"), `${source.join("\n")}\n`);
  const repeatedPayload = { id: "synthetic-duplicate", text: "Delivery configuration is unresolved", nextCursor: "duplicate-page-2" };
  const envelopes = {
    duplicate: {
      content: [
        { type: "text", text: JSON.stringify(repeatedPayload) },
        { type: "text", text: "Additional text-only warning must remain." },
      ],
      structuredContent: repeatedPayload,
      isError: false,
      _meta: { provenance: "synthetic duplicate representations" },
    },
    distinct: {
      content: [{ type: "text", text: "Observed caller: src/send.js. Text-only warning: retry ownership remains unresolved." }],
      structuredContent: { caller: "src/send.js", configuration: "config/retry.json", nextCursor: "page-2", hasMore: true },
      isError: false,
      _meta: { provenance: "synthetic page one; not runtime evidence" },
    },
    error: {
      content: [{ type: "text", text: "Read failed for config/retry.json; do not infer its contents." }],
      structuredContent: { error: { code: "SOURCE_UNAVAILABLE", message: "Configuration could not be read" }, nextCursor: "page-3" },
      isError: true,
      _meta: { provenance: "synthetic page two" },
    },
    truncated: {
      content: [{ type: "text", text: "Beginning of source excerpt only." }],
      structuredContent: { path: "src/inspection.js", coveredLines: [1, 80], truncated: true, nextLine: 81 },
      _meta: { provenance: "synthetic bounded read" },
    },
  };
  const toolDirectory = join(destination, "synthetic-tool-results");
  mkdirSync(toolDirectory);
  for (const [name, envelope] of Object.entries(envelopes)) {
    writeFileSync(join(toolDirectory, `${name}.json`), `${JSON.stringify(envelope, null, 2)}\n`);
  }
  return destination;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error("Usage: node create-fixture.mjs <new-disposable-project-root>");
  createFixture(resolve(process.argv[2]));
}
