---
name: codex-advisor
description: Consult a configured native Codex subagent for a focused second opinion when a consequential decision is ambiguous, repeated approaches fail, evidence conflicts, or the user explicitly asks for an advisor. The main agent retains the task.
---

# Codex Advisor

Use one native Codex subagent for focused advice, then continue the original task. The advisor may use its normal available tools to check evidence. Its role is to advise; it does not take over implementation or communication with the user.

## When to consult

Consult proactively under standing authorization; do not wait for the user to invoke the skill when the following conditions apply.

After enough ordinary inspection to state the unresolved question, consult the advisor when independent scrutiny could change a consequential next step:
- Material assumptions or competing explanations remain unresolved.
- Attempts have stopped producing useful evidence and the next step would require a substantial workaround or scope expansion.
- Credible evidence conflicts.
- A named consequential failure mode remains inadequately addressed by available checks or prior independent review.

Consult before taking the step that depends on that uncertainty, while continuing useful independent work. Skip routine questions a quick direct check can settle and questions already covered by adequate independent review unless new evidence or a material revision changes the question. Do not consult merely because a task is large or complex, or because hypothetical risks can be imagined. Use one focused consultation per unresolved question, not repeated approval rounds.

An explicit `$codex-advisor` invocation or user request for an advisor takes precedence over routine skip guidance. If progress requires the user's preference, authorization, unavailable access, or missing facts, ask the user; an advisor cannot supply those.

## Advisor configuration

Default advisor: `gpt-6.2-astra` at `high` reasoning. These are settings for the native subagent call, not a promise about the model selected by the host. Configure a different advisor model or effort through a higher-priority instruction or by changing this skill before installation. If the configured model or effort is invalid, unavailable, or unsupported by the dispatch tool, report an advisor configuration or dispatch error. Do not silently change the model, effort, or use inherited defaults. Use an alternative only when the user explicitly authorizes it. Continue independent work with the available evidence; if advisor approval is a required prerequisite, leave the dependent decision or action pending.

Consultation eligibility depends on the question, not the main agent's model or reasoning settings. Establishing the working model or reasoning effort is not required. Independent scrutiny from the same model is permitted. Do not describe it as a stronger-model review without evidence.

Do not consult an advisor from inside an advisor consultation. Include that instruction in the advisor assignment. If no native subagent tool is available, report the limitation briefly and continue independent work where possible. Preserve any explicit requirement for advisor approval before the dependent action.

## Dispatch

Read the native subagent tool's **current** argument contract. If it cannot select both the configured model and effort, do not dispatch an inherited-model substitute; report that the requested consultation is unavailable and continue with the evidence available. Otherwise request the configured settings and pass this assignment, adapted to the issue:

> You are an advisor to the main Codex agent. Give a focused second opinion on the question below. Use your normal available tools to inspect evidence when useful. Do not invoke another advisor. Return a concrete recommendation, the evidence or assumptions behind it, and the main uncertainty or condition that would change it. The main agent owns the original task and user communication.

Give the advisor the user's task, relevant constraints and authorization, source locations or verified observations, approaches already tried and their results, and one precise question. Include only context needed for the decision; distinguish observed facts from your interpretation. If the native tool supports a full history fork **with** the requested model and effort, use it. If its current contract requires a partial or empty fork for model/effort overrides, follow that contract and provide this focused context packet. A packet is a summary, not the full conversation. Do not use an enormous turn count to imitate a full history fork.

Wait for the advisor's answer. If the tool reports effective model or reasoning settings, verify each reported setting against the request. A reported mismatch is an advisor dispatch error; report it and do not present the result as the configured advisor's guidance. Missing effective settings alone are not an error and do not require a routine caveat. Attribute the advice to "the advisor" without claiming a verified execution model. When the user asks which model ran, requests runtime proof, or a prerequisite explicitly requires verified model or reasoning settings, distinguish the requested settings from what the tool actually confirms. Missing required confirmation leaves that prerequisite unresolved.

Check material claims against available evidence, give the advice serious weight, and resolve any conflict with verified evidence before acting. Briefly share useful guidance or a genuine unresolved disagreement with the user, then resume the task. The advisor's answer does not authorize actions beyond the user's existing instructions.
