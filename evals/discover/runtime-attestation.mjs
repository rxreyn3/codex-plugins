import crypto from "node:crypto";

import { parse as parseYaml } from "yaml";

// Runtime attestation deliberately lives outside the discovery skill. The skill
// proposes and dispatches work; this module observes the app-server protocol and
// independently decides whether the approved card became the child run we saw.
// Keep the evidence compact and non-secret: hashes and runtime settings are
// retained, while child prompts and outputs are not.

// Only fields visible in an approved card participate in its canonical
// dispatch envelope. A fixed allowlist prevents incidental YAML or later display
// metadata from silently changing what the evaluator considers approved.
const CARD_FIELDS = [
  "id",
  "task_name",
  "role",
  "purpose",
  "prompt",
  "inputs",
  "repository",
  "branch",
  "commit",
  "working_tree_sha256",
  "model",
  "reasoning",
  "sandbox_request",
  "sandbox_enforcement",
  "behavioral_permissions",
  "intended_tools",
  "child_agents",
  "budget",
  "expected_evidence",
  "output_schema",
  "stop_when",
];

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

// Stable serialization makes hashes independent of object insertion order. It
// is not intended as a general canonical JSON implementation; it only handles
// the plain data structures used by cards and app-server settings.
export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function canonicalCard(card) {
  return Object.fromEntries(CARD_FIELDS.map((field) => [field, card?.[field]]));
}

// The versioned wrapper lets the child distinguish a role contract from ordinary
// inherited prose and gives future formats an explicit compatibility boundary.
export function dispatchEnvelope(card) {
  return {
    protocol: card?.dispatch_protocol,
    card: canonicalCard(card),
  };
}

export function expectedTaskName(card) {
  if (typeof card?.task_name === "string" && card.task_name.length > 0) return card.task_name;
  const id = String(card?.id ?? "card").toLowerCase().replaceAll(/[^a-z0-9]+/g, "_");
  const role = String(card?.role ?? "agent")
    .replace(/^rpivc-/, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_");
  return `${id}_${role}`.replaceAll(/^_+|_+$/g, "");
}

// Cards are extracted from the same Markdown shown to the user. Restricting the
// role prefix avoids treating unrelated YAML examples or artifact frontmatter as
// executable dispatch cards.
export function extractAgentCards(markdown) {
  const cards = [];
  for (const match of String(markdown).matchAll(/```yaml\s*([\s\S]*?)```/gi)) {
    try {
      const parsed = parseYaml(match[1]);
      if (parsed && typeof parsed === "object" && /^rpivc-codebase-/.test(String(parsed.role ?? ""))) {
        cards.push(parsed);
      }
    } catch {
      // A malformed display card is handled by the ordinary interaction assertions.
    }
  }
  return cards;
}

function parsedArguments(item) {
  if (typeof item?.arguments !== "string") return null;
  try {
    return JSON.parse(item.arguments);
  } catch {
    return null;
  }
}

function contentDigest(content) {
  const serialized = stableJson(content ?? null);
  return { sha256: sha256(serialized), bytes: Buffer.byteLength(serialized) };
}

/**
 * Reduce one raw app-server notification to the safe facts needed for proof.
 *
 * The provider calls this before Promptfoo normalizes and redacts unknown event
 * fields. Do not retain plaintext child prompts or output here. A raw encrypted
 * prompt is represented only by its hash and byte length.
 */
export function captureAttestationEvent(message) {
  const params = message?.params ?? {};
  if (message?.method === "thread/settings/updated") {
    const settings = params.threadSettings ?? {};
    return {
      kind: "thread-settings",
      thread_id: params.threadId ?? null,
      model: settings.model ?? null,
      effort: settings.effort ?? null,
      sandbox_policy: settings.sandboxPolicy ?? null,
      approval_policy: settings.approvalPolicy ?? null,
      collaboration_mode: settings.collaborationMode?.mode ?? null,
    };
  }

  if (message?.method === "turn/completed") {
    return {
      kind: "turn-completed",
      thread_id: params.threadId ?? null,
      turn_id: params.turn?.id ?? params.turnId ?? null,
      status: params.turn?.status ?? null,
      error: params.turn?.error?.message ?? null,
    };
  }

  if (["item/started", "item/completed"].includes(message?.method)) {
    const item = params.item ?? {};
    if (item.type === "subAgentActivity") {
      return {
        kind: "subagent-activity",
        event: message.method,
        parent_thread_id: params.threadId ?? null,
        call_id: item.id ?? null,
        activity: item.kind ?? null,
        child_thread_id: item.agentThreadId ?? null,
        agent_path: item.agentPath ?? null,
      };
    }
    if (item.type === "collabAgentToolCall") {
      return {
        kind: "collaboration-call",
        event: message.method,
        thread_id: params.threadId ?? null,
        call_id: item.id ?? null,
        tool: item.tool ?? null,
        status: item.status ?? null,
        sender_thread_id: item.senderThreadId ?? null,
        receiver_thread_ids: item.receiverThreadIds ?? [],
        model: item.model ?? null,
        reasoning_effort: item.reasoningEffort ?? null,
      };
    }
    return null;
  }

  if (message?.method !== "rawResponseItem/completed") return null;
  const item = params.item ?? {};
  if (item.type === "function_call" && item.name === "spawn_agent") {
    const args = parsedArguments(item);
    let canonicalEnvelopeSha256 = null;
    let messageSha256 = null;
    let messageBytes = null;
    if (typeof args?.message === "string") {
      messageSha256 = sha256(args.message);
      messageBytes = Buffer.byteLength(args.message);
      try {
        canonicalEnvelopeSha256 = sha256(stableJson(JSON.parse(args.message)));
      } catch {
        // Current Codex transports this field as encrypted text. Plain JSON is
        // still supported so a future protocol can prove exact envelope bytes.
      }
    }
    return {
      kind: "spawn-call",
      thread_id: params.threadId ?? null,
      turn_id: params.turnId ?? null,
      call_id: item.call_id ?? null,
      task_name: args?.task_name ?? null,
      fork_turns: args?.fork_turns ?? null,
      model: args?.model ?? null,
      reasoning_effort: args?.reasoning_effort ?? null,
      message_sha256: messageSha256,
      message_bytes: messageBytes,
      canonical_envelope_sha256: canonicalEnvelopeSha256,
    };
  }

  if (item.type === "agent_message") {
    const digest = contentDigest(item.content);
    return {
      kind: "agent-output",
      thread_id: params.threadId ?? null,
      turn_id: params.turnId ?? null,
      author: item.author ?? null,
      recipient: item.recipient ?? null,
      content_sha256: digest.sha256,
      content_bytes: digest.bytes,
    };
  }
  return null;
}

function equalJson(left, right) {
  return stableJson(left) === stableJson(right);
}

/**
 * Join independent protocol events into one verdict for an approved card.
 *
 * Correlation intentionally crosses several event families: the parent spawn
 * identifies the request, subagent activity supplies the child task ID, child
 * settings prove effective configuration, and completion/output events prove
 * the child actually ran. No single child-authored message is trusted as proof.
 */
export function buildDispatchAttestation({ events, parentThreadId, card }) {
  const expectedEnvelopeSha256 = sha256(stableJson(dispatchEnvelope(card)));
  const expectedName = expectedTaskName(card);
  // Match within the parent task as well as by task name so two cases may reuse
  // the same card identifiers without cross-attributing their children.
  const spawn = events.findLast((event) => event.kind === "spawn-call"
    && event.thread_id === parentThreadId
    && event.task_name === expectedName);
  const activity = spawn
    ? events.find((event) => event.kind === "subagent-activity" && event.call_id === spawn.call_id && event.child_thread_id)
    : null;
  const childThreadId = activity?.child_thread_id ?? null;
  // Use the last settings record because the provider may append a stronger
  // thread/resume observation after the streamed parent-turn notifications.
  const childSettings = childThreadId
    ? events.findLast((event) => event.kind === "thread-settings" && event.thread_id === childThreadId)
    : null;
  const parentSettings = events.findLast((event) => event.kind === "thread-settings" && event.thread_id === parentThreadId);
  const completion = childThreadId
    ? events.findLast((event) => event.kind === "turn-completed" && event.thread_id === childThreadId)
    : null;
  const childOutput = activity?.agent_path
    ? events.findLast((event) => event.kind === "agent-output" && event.author === activity.agent_path)
    : null;
  const nestedSpawns = childThreadId
    ? events.filter((event) => event.kind === "spawn-call" && event.thread_id === childThreadId)
    : [];

  const checks = {
    spawn_observed: Boolean(spawn),
    prompt_transport_observed: Boolean(spawn?.message_sha256 && spawn?.message_bytes > 0),
    task_name_matches: spawn?.task_name === expectedName,
    no_inherited_conversation: spawn?.fork_turns === "none",
    requested_model_matches: spawn?.model === card?.model,
    requested_reasoning_matches: spawn?.reasoning_effort === card?.reasoning,
    child_thread_observed: Boolean(childThreadId),
    effective_model_matches: childSettings?.model === card?.model,
    effective_reasoning_matches: childSettings?.effort === card?.reasoning,
    sandbox_inherits_parent: Boolean(childSettings && parentSettings)
      && equalJson(childSettings.sandbox_policy, parentSettings.sandbox_policy),
    child_completed: completion?.status === "completed" && completion?.error == null,
    child_output_observed: Boolean(childOutput?.content_sha256),
    no_child_fanout: nestedSpawns.length === 0,
  };

  return {
    schema: "rpivc-runtime-attestation/v1",
    card_id: card?.id ?? null,
    role: card?.role ?? null,
    expected_task_name: expectedName,
    prompt_verification: {
      displayed_card_sha256: expectedEnvelopeSha256,
      transport_sha256: spawn?.message_sha256 ?? null,
      transport_bytes: spawn?.message_bytes ?? null,
      status: spawn?.canonical_envelope_sha256 === expectedEnvelopeSha256
        ? "plaintext-envelope-matched"
        : "opaque-encrypted-transport",
      // This flag must remain false when Codex exposes only ciphertext. Treating
      // an opaque transport hash as a plaintext match would manufacture proof.
      exact_plaintext_observed: spawn?.canonical_envelope_sha256 === expectedEnvelopeSha256,
      limitation: spawn?.canonical_envelope_sha256 === expectedEnvelopeSha256
        ? null
        : "Codex encrypts the child payload before app-server and rollout evidence expose it",
    },
    spawn: spawn ?? null,
    child: {
      thread_id: childThreadId,
      agent_path: activity?.agent_path ?? null,
      settings: childSettings ? {
        model: childSettings.model,
        effort: childSettings.effort,
        sandbox_policy: childSettings.sandbox_policy,
        approval_policy: childSettings.approval_policy,
      } : null,
      completion: completion ? { status: completion.status, error: completion.error } : null,
      output_sha256: childOutput?.content_sha256 ?? null,
      output_bytes: childOutput?.content_bytes ?? null,
      nested_spawn_count: nestedSpawns.length,
    },
    parent: parentSettings ? { sandbox_policy: parentSettings.sandbox_policy } : null,
    checks,
    pass: Object.values(checks).every(Boolean),
  };
}
