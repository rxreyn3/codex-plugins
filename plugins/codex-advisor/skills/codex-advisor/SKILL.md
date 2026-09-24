---
name: codex-advisor
description: Consult a configured native Codex subagent for a focused second opinion when a consequential decision is ambiguous, repeated approaches fail, evidence conflicts, or the user explicitly asks for an advisor. The main agent retains the task.
---

# Codex Advisor

Use one native Codex subagent for focused advice, then continue the original task. The advisor may use its normal available tools to check evidence. Its role is to advise; it does not take over implementation or communication with the user.

## When to consult

Consult proactively when a choice could materially affect the result and the evidence does not settle it, when repeated attempts are not converging, or when credible sources conflict. First do enough ordinary inspection to state the actual uncertainty. Do not consult for routine work, every task opening, every completion, or a question that a quick direct check will resolve. Avoid a second consultation on the same issue unless new evidence changes the question.

An explicit `$codex-advisor` invocation or user request for an advisor bypasses the automatic skip policy below. A user may request a same-tier second opinion; describe it as such rather than as a stronger-model review.

## Advisor configuration and automatic skip policy

Default advisor: `gpt-6-astra` at `high` reasoning. These are settings for the native subagent call, not a promise about the model selected by the host. Configure a different advisor model or effort through a higher-priority instruction or by changing this skill before installation. If the requested model or effort is unavailable, do not silently substitute a different model; report the limitation and continue with the evidence available, unless the user explicitly chose an alternative.

For automatic consultation, establish the **current working model** from a field in current-task system or developer metadata that explicitly identifies the active model, a native runtime result that explicitly identifies it, or the user's declaration of the working model for this task. Use only sources actually exposed in the task; do not invent a model-inspection tool. A list of available models, saved default, earlier task, or request for a particular **advisor** model does not identify the working model. If sources conflict, the working model changes, or a declaration is no longer reliable, treat the model as unknown until clarified. When an automatic trigger arises but the working model is unknown, briefly explain that eligibility cannot be established and continue; the user can declare the working model for this task or request an advisor manually. Do not interrupt routine work to ask for model identity.

With the default advisor, automatic consultation is permitted when that current working model is `gpt-6-sol` or `gpt-6-luna`, at **any** working reasoning effort. Skip automatically for `gpt-6-astra` at every effort and for any other model. This is an explicit model policy, not an inferred ranking. If the advisor model or effort changes, automatic consultation is off until a higher-priority instruction or this section defines an explicit eligible working-model list for the new configuration. Manual requests still work.

Do not consult an advisor from inside an advisor consultation. Include that instruction in the advisor assignment. If no native subagent tool is available, continue independently and mention the limitation when the user requested the consultation explicitly.

## Dispatch

Read the native subagent tool's **current** argument contract. If it cannot select both the configured model and effort, do not dispatch an inherited-model substitute; report that the requested consultation is unavailable and continue with the evidence available. Otherwise request the configured settings and pass this assignment, adapted to the issue:

> You are an advisor to the main Codex agent. Give a focused second opinion on the question below. Use your normal available tools to inspect evidence when useful. Do not invoke another advisor. Return a concrete recommendation, the evidence or assumptions behind it, and the main uncertainty or condition that would change it. The main agent owns the original task and user communication.

Give the advisor the user's task, relevant constraints and authorization, source locations or verified observations, approaches already tried and their results, and one precise question. Include only context needed for the decision; distinguish observed facts from your interpretation. If the native tool supports a full history fork **with** the requested model and effort, use it. If its current contract requires a partial or empty fork for model/effort overrides, follow that contract and provide this focused context packet. A packet is a summary, not the full conversation. Do not use an enormous turn count to imitate a full history fork.

Wait for the advisor's answer. If the tool reports the effective model and effort, verify they match the request. Requested arguments alone do not prove which model ran; if reported settings differ, do not present the result as the configured advisor's guidance. Check material claims against available evidence, give the advice serious weight, and resolve any conflict with verified evidence before acting. Briefly share useful guidance or a genuine unresolved disagreement with the user, then resume the task. The advisor's answer does not authorize actions beyond the user's existing instructions.
