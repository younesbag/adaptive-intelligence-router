# Adaptive Intelligence Router — routing policy

The main session is the lead orchestrator. Delegate bounded work to the cheapest model × effort that will succeed on the first attempt. Optimize the total expected cost of a *correct* result — including retries, regressions, and context pollution — not the lowest token count.

## Hard rules (mechanically enforced by the gate hook)
- **Never route work through Haiku.** Hierarchy: Sonnet → Opus → Fable.
- **Always pass the `model` parameter explicitly** when invoking a pool worker or Explore — protection against definition drift.
- **Never delegate to catch-all agents** (`general-purpose`, `claude`): they inherit the parent model and bypass routing.

## Judgment rules (behavioral — re-injected at every session start and after compaction)
- Route by **cognitive difficulty, not task size** — a 500-file mechanical migration is Sonnet work; a 20-line concurrency bug may be Opus/Fable work.
- The cheapest agent is often no agent: don't delegate one grep, one tiny edit, or work whose orchestration overhead exceeds the work itself.

## Worker pool (`~/.claude/agents/router-<model>-<effort>.md`)
- `router-sonnet-{low,medium,high,xhigh}` — clear, bounded, verifiable implementation; exploration with a precise goal; tests; docs; mechanical changes. Default: medium.
- `router-opus-{medium,high,xhigh}` — difficult implementation, complex debugging, cross-layer changes, subtle state/concurrency. Default for genuinely hard engineering: high.
- `router-fable-{medium,high,xhigh,max}` — architecture, ambiguity, security/auth/billing, destructive migrations, high blast radius, conflicting evidence. `max` only for frontier-difficulty + high cost of error + residual uncertainty after cheaper analysis.
- `Explore` — Sonnet-medium read-only repository discovery; use it instead of letting exploration inherit an expensive parent model.

## Escalation
Workers escalate instead of bluffing. Escalate Sonnet → Opus → Fable when: false assumptions, scope growth, hidden coupling, conflicting evidence, low confidence, two failed fixes, or security/billing/data-integrity surface area appears. Before escalating, diagnose: model capability vs. missing context vs. wrong decomposition vs. wrong hypothesis vs. infrastructure failure. Fix context before buying intelligence.

## Verification routing
Depth scales with risk × uncertainty × blast radius: deterministic → tests or Sonnet; normal → Sonnet high / Opus medium; complex → Opus high; high-risk (payments, auth, production data) → Fable adversarial pass. Prefer an independent context for verifying difficult or security-sensitive work.

## Honesty about routes
Requested model ≠ proof it ran. Track requested vs. effective vs. unverified; a runtime substitution or fallback is authoritative. Never record a substituted run as evidence about the requested model. If an environment override (`CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_EFFORT_LEVEL`, a model allowlist) defeats routing, say so once and continue with the best achievable behavior — never pretend routing works when it doesn't.

## Calibration
Routing lessons (≥3 consistent observations, or one very costly miss) go in the project's `.claude/agent-memory-local/adaptive-router/MEMORY.md` — read once per session when routing substantial work; never committed as product code. Worker files added to an existing `agents/` directory are picked up automatically; a brand-new `agents/` directory is read at the next session start.
