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
  "dispatch_mode",
  "depends_on",
  "task_name",
  "role",
  "runtime_agent_type",
  "specialist_contract",
  "specialist_contract_sha256",
  "scope_validator",
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
      if (parsed && typeof parsed === "object" && /^rpivc-(?:scope-tracer|codebase-|integration-scanner|precedent-locator$)/.test(String(parsed.role ?? ""))) {
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

function assignedTemplateLiteral(input, variableName) {
  if (!variableName) return null;
  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignment = new RegExp("\\bconst\\s+" + escapedName + "\\s*=\\s*`").exec(input);
  if (!assignment) return null;
  let value = "";
  for (let index = assignment.index + assignment[0].length; index < input.length; index += 1) {
    const character = input[index];
    if (character === "`") return value;
    if (character === "\\" && index + 1 < input.length) {
      const next = input[index + 1];
      if (["`", "\\", "$"].includes(next)) {
        value += next;
        index += 1;
        continue;
      }
    }
    value += character;
  }
  return null;
}

function nestedSpawnArguments(item) {
  if (item?.type !== "custom_tool_call" || item?.name !== "exec" || typeof item?.input !== "string") return null;
  if (!item.input.includes("multi_agent_v1__spawn_agent")) return null;
  const stringField = (name) => item.input.match(new RegExp(`\\b${name}:\\s*[\"']([^\"']+)[\"']`))?.[1] ?? null;
  const explicitMessageVariable = item.input.match(/\bmessage:\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*[,}]/)?.[1] ?? null;
  const serializedMessageVariable = item.input.match(/\bmessage:\s*JSON\.stringify\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*[,}]/)?.[1] ?? null;
  const usesMessageShorthand = /multi_agent_v1__spawn_agent\s*\(\{[\s\S]*?\bmessage\s*[,}]/.test(item.input);
  const messageVariable = explicitMessageVariable ?? serializedMessageVariable ?? (usesMessageShorthand ? "message" : null);
  const escapedMessageVariable = messageVariable?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") ?? null;
  const variableCardText = assignedTemplateLiteral(item.input, messageVariable);
  let cardText = variableCardText
    ?? item.input.match(/\bmessage:\s*`([\s\S]*?)`\s*[,}]/)?.[1]
    ?? null;
  let card = null;
  if (cardText) {
    try {
      card = parseYaml(cardText);
    } catch {
      // Malformed child input is retained as an observed but failing dispatch.
    }
  }
  if (!card && serializedMessageVariable && escapedMessageVariable) {
    const objectText = item.input.match(new RegExp(`const\\s+${escapedMessageVariable}\\s*=\\s*(\\{[\\s\\S]*?\\});`))?.[1] ?? null;
    if (objectText) {
      try {
        card = parseYaml(objectText);
        cardText = JSON.stringify(card);
      } catch {
        // Malformed child input is retained as an observed but failing dispatch.
      }
    }
  }
  const cardMember = (name, member) => {
    if (!escapedMessageVariable || !card) return null;
    const reference = new RegExp(`\\b${name}:\\s*${escapedMessageVariable}\\.${member}\\s*[,}]`);
    return reference.test(item.input) ? card[member] ?? null : null;
  };
  const forkContext = item.input.match(/\bfork_context:\s*(true|false)/)?.[1] ?? null;
  return {
    agent_type: stringField("agent_type") ?? cardMember("agent_type", "runtime_agent_type"),
    fork_context: forkContext === null ? null : forkContext === "true",
    model: stringField("model") ?? cardMember("model", "model"),
    reasoning_effort: stringField("reasoning_effort") ?? cardMember("reasoning_effort", "reasoning"),
    card,
    card_text: cardText,
  };
}

function outputText(item) {
  if (typeof item?.output === "string") return item.output;
  if (!Array.isArray(item?.output)) return "";
  return item.output.map((entry) => typeof entry?.text === "string" ? entry.text : "").join("\n");
}

function messageText(item) {
  if (!Array.isArray(item?.content)) return "";
  return item.content.map((entry) => typeof entry?.text === "string" ? entry.text : "").join("\n");
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
      const receiverThreadIds = item.receiverThreadIds ?? [];
      return {
        kind: "collaboration-call",
        event: message.method,
        thread_id: params.threadId ?? null,
        call_id: item.id ?? null,
        tool: item.tool ?? null,
        status: item.status ?? null,
        sender_thread_id: item.senderThreadId ?? null,
        receiver_thread_ids: receiverThreadIds,
        child_thread_id: item.tool === "spawnAgent" && receiverThreadIds.length === 1
          ? receiverThreadIds[0]
          : null,
        agent_path: item.tool === "spawnAgent" && receiverThreadIds.length === 1
          ? receiverThreadIds[0]
          : null,
        model: item.model ?? null,
        reasoning_effort: item.reasoningEffort ?? null,
      };
    }
    return null;
  }

  if (message?.method !== "rawResponseItem/completed") return null;
  const item = params.item ?? {};
  const nestedArgs = nestedSpawnArguments(item);
  if (nestedArgs) {
    const messageSha256 = nestedArgs.card_text ? sha256(nestedArgs.card_text) : null;
    return {
      kind: "dispatch-call",
      dispatch_mode: "spawn",
      spawn_schema: "multi-agent-v1",
      tool: "multi_agent_v1__spawn_agent",
      thread_id: params.threadId ?? null,
      turn_id: params.turnId ?? null,
      call_id: item.call_id ?? null,
      task_name: nestedArgs.card?.task_name ?? null,
      agent_type: nestedArgs.agent_type,
      fork_turns: nestedArgs.fork_context === false
        ? "none"
        : nestedArgs.fork_context === true ? "all" : null,
      model: nestedArgs.model,
      reasoning_effort: nestedArgs.reasoning_effort,
      message_sha256: messageSha256,
      message_bytes: nestedArgs.card_text ? Buffer.byteLength(nestedArgs.card_text) : null,
      canonical_envelope_sha256: nestedArgs.card
        ? sha256(stableJson(dispatchEnvelope(nestedArgs.card)))
        : null,
    };
  }
  if (item.type === "custom_tool_call_output") {
    const match = outputText(item).match(/"agent_id"\s*:\s*"([^"]+)"/);
    if (match) {
      return {
        kind: "spawn-result",
        call_id: item.call_id ?? null,
        child_thread_id: match[1],
        agent_path: match[1],
      };
    }
  }
  if (item.type === "message" && item.role === "user") {
    const text = messageText(item);
    if (text.includes("<subagent_notification>")) {
      const jsonText = text.slice(text.indexOf("{")).replace(/\s*<\/subagent_notification>[\s\S]*$/, "").trim();
      try {
        const notification = JSON.parse(jsonText);
        const completedOutput = notification?.status?.completed;
        return {
          kind: "child-notification",
          child_thread_id: notification?.agent_path ?? null,
          agent_path: notification?.agent_path ?? null,
          status: typeof completedOutput === "string" ? "completed" : null,
          error: notification?.status?.errored ?? null,
          content_sha256: typeof completedOutput === "string" ? sha256(completedOutput) : null,
          content_bytes: typeof completedOutput === "string" ? Buffer.byteLength(completedOutput) : null,
        };
      } catch {
        // A malformed notification cannot attest child completion.
      }
    }
  }
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
      kind: "dispatch-call",
      dispatch_mode: "spawn",
      spawn_schema: "native-collaboration",
      tool: item.name,
      thread_id: params.threadId ?? null,
      turn_id: params.turnId ?? null,
      call_id: item.call_id ?? null,
      task_name: args?.task_name ?? null,
      agent_type: args?.agent_type ?? null,
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

export function compareSandboxPolicies(childPolicy, parentPolicy) {
  if (!childPolicy || !parentPolicy) return { pass: false, status: "missing-policy" };
  if (equalJson(childPolicy, parentPolicy)) return { pass: true, status: "exact-match" };
  const visibleFields = ["type", "networkAccess", "excludeTmpdirEnvVar", "excludeSlashTmp"];
  const visibleFieldsMatch = visibleFields.every((field) => childPolicy[field] === parentPolicy[field]);
  if (visibleFieldsMatch && parentPolicy.writableRoots === "[...]") {
    return {
      pass: true,
      status: "visible-policy-match-parent-roots-redacted",
    };
  }
  return { pass: false, status: "mismatch" };
}

/**
 * Join independent protocol events into one verdict for an approved card.
 *
 * Correlation intentionally crosses several event families: the parent dispatch
 * identifies the request, subagent activity supplies the child task ID, child
 * settings prove effective configuration, and completion/output events prove
 * the child actually ran. No single child-authored message is trusted as proof.
 */
export function buildDispatchAttestation({ events, parentThreadId, card }) {
  const expectedEnvelopeSha256 = sha256(stableJson(dispatchEnvelope(card)));
  const expectedName = expectedTaskName(card);
  const dispatchMode = card?.dispatch_mode ?? "spawn";
  // Match within the parent task as well as by task name so two cases or later
  // approved dependent waves cannot cross-attribute child activity.
  const dispatch = events.findLast((event) => event.kind === "dispatch-call"
    && event.thread_id === parentThreadId
    && event.dispatch_mode === dispatchMode
    && event.task_name === expectedName);
  const dispatchIndex = dispatch ? events.lastIndexOf(dispatch) : -1;
  const nextDispatchIndex = dispatchIndex < 0
    ? -1
    : events.findIndex((event, index) => index > dispatchIndex && event.kind === "dispatch-call");
  const subsequentEvents = dispatchIndex < 0
    ? []
    : events.slice(dispatchIndex + 1, nextDispatchIndex < 0 ? undefined : nextDispatchIndex);
  const activity = dispatch
    ? events.find((event) => ["subagent-activity", "spawn-result", "collaboration-call"].includes(event.kind)
      && event.call_id === dispatch.call_id && event.child_thread_id)
      ?? subsequentEvents.find((event) => event.kind === "collaboration-call"
        && event.tool === "spawnAgent" && event.child_thread_id)
      ?? subsequentEvents.find((event) => event.kind === "child-notification" && event.child_thread_id)
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
      ?? (activity?.kind === "child-notification" ? activity : null)
    : null;
  const childOutput = activity?.agent_path
    ? events.findLast((event) => event.kind === "agent-output" && event.author === activity.agent_path)
      ?? (activity?.kind === "child-notification" ? activity : null)
    : null;
  const nestedSpawns = childThreadId
    ? events.filter((event) => event.kind === "dispatch-call" && event.dispatch_mode === "spawn" && event.thread_id === childThreadId)
    : [];
  const nestedSpawnObservation = childThreadId
    ? events.findLast((event) => event.kind === "nested-spawn-observation" && event.thread_id === childThreadId)
    : null;
  const sandboxVerification = compareSandboxPolicies(
    childSettings?.sandbox_policy,
    parentSettings?.sandbox_policy,
  );

  const checks = {
    dispatch_observed: Boolean(dispatch),
    dispatch_mode_matches: dispatch?.dispatch_mode === dispatchMode,
    native_collaboration_dispatch: dispatch?.spawn_schema === "native-collaboration"
      && dispatch?.tool === "spawn_agent",
    prompt_transport_observed: Boolean(dispatch?.message_sha256 && dispatch?.message_bytes > 0),
    prompt_envelope_matches_or_is_opaque: dispatch?.canonical_envelope_sha256 == null
      || dispatch.canonical_envelope_sha256 === expectedEnvelopeSha256,
    task_name_matches: dispatch?.task_name === expectedName,
    // The native collaboration schema makes agent_type optional and omission
    // selects the default runtime agent. Preserve the raw null in evidence, but
    // compare its effective value so a semantically identical call does not fail.
    requested_runtime_agent_matches: (dispatch?.agent_type ?? "default") === card?.runtime_agent_type,
    context_mode_matches: dispatch?.fork_turns === "none",
    requested_model_matches: dispatch?.model === card?.model,
    requested_reasoning_matches: dispatch?.reasoning_effort === card?.reasoning,
    child_thread_observed: Boolean(childThreadId),
    effective_model_matches: childSettings?.model === card?.model,
    effective_reasoning_matches: childSettings?.effort === card?.reasoning,
    sandbox_inherits_parent: sandboxVerification.pass,
    child_completed: completion?.status === "completed" && completion?.error == null,
    child_output_observed: Boolean(childOutput?.content_sha256),
    no_child_fanout: nestedSpawnObservation
      ? nestedSpawnObservation.count === 0
      : nestedSpawns.length === 0,
  };

  return {
    schema: "rpivc-runtime-attestation/v5",
    card_id: card?.id ?? null,
    role: card?.role ?? null,
    dispatch_mode: dispatchMode,
    depends_on: card?.depends_on ?? [],
    expected_task_name: expectedName,
    prompt_verification: {
      displayed_card_sha256: expectedEnvelopeSha256,
      transport_sha256: dispatch?.message_sha256 ?? null,
      transport_bytes: dispatch?.message_bytes ?? null,
      status: dispatch?.canonical_envelope_sha256 == null
        ? "opaque-encrypted-transport"
        : dispatch.canonical_envelope_sha256 === expectedEnvelopeSha256
          ? "plaintext-envelope-matched"
          : "plaintext-envelope-mismatch",
      // This flag must remain false when Codex exposes only ciphertext. Treating
      // an opaque transport hash as a plaintext match would manufacture proof.
      exact_plaintext_observed: dispatch?.canonical_envelope_sha256 === expectedEnvelopeSha256,
      limitation: dispatch?.canonical_envelope_sha256 == null
        ? "Codex encrypts the child payload before app-server and rollout evidence expose it"
        : null,
    },
    dispatch: dispatch ?? null,
    child: {
      thread_id: childThreadId,
      agent_path: activity?.agent_path ?? null,
      origin_runtime_agent: dispatch?.agent_type ?? null,
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
    sandbox_verification: sandboxVerification,
    checks,
    pass: Object.values(checks).every(Boolean),
  };
}
