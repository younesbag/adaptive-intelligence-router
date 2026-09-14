# What is enforced, what is behavioral, what is only detected

A routing setup that lives purely in instructions is a promise. This one splits the rules into three honest categories.

## 1. Mechanically enforced — the gate hook

`hooks/gate.js` runs as a `PreToolUse` hook on the Agent tool (matcher `Agent|Task`), **outside the model**. It reads the tool call, and exits with code 2 to block it. The reason goes back to the model, which re-issues the call correctly.

| Rule | Check | On violation |
|---|---|---|
| Never Haiku | `model` contains `haiku` | blocked, for any agent |
| Explicit model on pool workers | `router-<tier>-<effort>` invoked without `model`, or with a model of a different tier | blocked; the message names the correct `model` or the correct worker |
| Explore runs on Sonnet | `Explore` invoked without `model`, or with a non-Sonnet model | blocked |
| No catch-all agents | `general-purpose` or `claude` | blocked unless `ROUTER_GATE_ALLOW_GENERAL=1` |

Accepted model spellings per tier: the alias (`sonnet`), alias variants (`sonnet[1m]`), and full ids (`claude-sonnet-…`). Case-insensitive.

The gate **fails open**: malformed input or an unexpected tool never blocks anything. It never inspects prompts or file contents — only `subagent_type` and `model`.

Specialised agents from plugins are allowed through (except on Haiku); the gate does not try to police agents it does not know.

## 2. Behavioral — re-injected every session

No hook can measure the cognitive difficulty of a task, decide that a worker should escalate, or choose how deep to verify. These live in `policy/adaptive-router.md` and in the worker definitions, and they are reinforced two ways:

- `hooks/session-start.js` prints a compact statement of the policy into context at **every** session start — including `resume`, `clear`, and **`compact`**, so the policy survives context compaction, the moment long sessions usually lose their early instructions.
- Each worker definition carries the escalation contract in its own body, so a worker reads it at spawn time regardless of the parent's state.

## 3. Detected and reported — not blocked

Some things legitimately override routing and are the user's decision:

- `CLAUDE_CODE_SUBAGENT_MODEL` forces one model for every subagent, above the definition's own `model`.
- `CLAUDE_CODE_EFFORT_LEVEL` forces an effort level.
- Organization model allowlists and effort limits (managed settings) narrow what any agent may use.

The preflight prints a warning into context when it finds the environment variables set, and the policy instructs the session to *say so once and continue* rather than claim routing works. Allowlists cannot be read reliably from a hook and are covered by the policy's honesty rule instead.

## What cannot be verified at call time

The `effort` of a worker comes from its definition file and is not visible in the tool call, so the gate cannot check it. Likewise, a requested model is not proof of the model that actually ran — a runtime substitution is authoritative. The policy makes the session track *requested vs. effective vs. unverified* and never record a substituted run as evidence about the requested model.
