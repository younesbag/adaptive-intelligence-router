# Adaptive Intelligence Router

**Model × effort routing for Claude Code — with hooks that actually enforce it.**

[العربية](README.ar.md) · [What is enforced](docs/ENFORCEMENT.md) · [Adapt to your plan](docs/CUSTOMIZE.md) · [Changelog](CHANGELOG.md)

Claude Code runs one model for everything by default. That means your strongest model reformats tables and rewrites paragraphs, burns through your usage window, and is missing when the hard decision arrives. This repository turns your session into an **orchestrator** that delegates every bounded task to the cheapest model × reasoning effort that will get it right the first time — and it adds two hooks so the hard rules are enforced by the harness, not merely promised by the model.

## What you get

| Piece | What it does |
|---|---|
| **A compact routing policy** (`policy/`) | Route by *cognitive difficulty, not task size*; the cheapest agent is often no agent; escalate instead of bluffing; verification depth scales with risk. One page — long policies get read once and forgotten. |
| **12 worker definitions** (`agents/`) | `router-<sonnet\|opus\|fable>-<effort>` primitives (11 of them, each with a fixed `model` and `effort`) plus `Explore`, a read-only Sonnet discovery agent so routine searching never inherits an expensive parent model. |
| **A delegation gate** (`hooks/gate.js`) | A `PreToolUse` hook on the Agent tool. Blocks Haiku, blocks pool workers invoked without an explicit matching `model`, blocks catch-all agents that bypass routing. The model receives the reason and re-issues the call correctly. |
| **A session preflight** (`hooks/session-start.js`) | Re-injects the policy at every session start **and after every context compaction** — exactly when long sessions forget — and warns when an environment override silently defeats routing. |
| **Installer / uninstaller** (`scripts/`) | Idempotent, user-level (all projects), timestamped backups of every file it touches, no dependencies. |

## Install in 60 seconds

Requirements: Claude Code with custom subagents and hooks (tested on 2.1.220, September 2026) and Node.js ≥ 18.

```bash
git clone https://github.com/younesbag/adaptive-intelligence-router.git
cd adaptive-intelligence-router
node scripts/install.js
```

Then **restart Claude Code** — hooks and a brand-new `agents/` directory are read at session start.

Verify, in any project:

1. Ask *“What routing policy is active?”* — the session should describe the pool and the rules.
2. Ask it to delegate something *“using model haiku”* — the gate must block it and the session should re-route to Sonnet.

Flags: `--dry-run` (show what would change), `--no-agents`, `--no-hooks`, `--no-policy`, `--force-policy`. The installer respects `CLAUDE_CONFIG_DIR`.

## How routing works

| Task class | Goes to | Why |
|---|---|---|
| Mechanical or clearly specified — renames, formatting, tests, docs, a 500-file migration with one pattern | `router-sonnet-medium` (low/high/xhigh as needed) | Big is not the same as hard |
| Read-only discovery — find files, symbols, usages | `Explore` | Searching should never run on the most expensive model |
| Genuinely hard engineering — complex debugging, cross-layer changes, subtle state | `router-opus-high` | Difficulty, not size, buys intelligence |
| Architecture, ambiguity, security/auth/billing, destructive migrations, conflicting evidence | `router-fable-high` / `xhigh` | High cost of error |
| One grep, one tiny edit, anything smaller than the cost of delegating it | **no agent** — the orchestrator does it | Delegation itself costs tokens and context |

Workers are contractually bounded: they respect scope and acceptance criteria, and when a task turns out harder than their tier they **stop guessing and escalate** with a reason instead of handing back a plausible bluff.

## What is enforced — and what is not

Be honest with yourself about this before you rely on any routing setup (see [docs/ENFORCEMENT.md](docs/ENFORCEMENT.md)):

- **Mechanically enforced by the gate hook:** no Haiku, explicit `model` on pool workers and Explore, no catch-all agents (`ROUTER_GATE_ALLOW_GENERAL=1` relaxes the last one).
- **Behavioral, reinforced every session:** *which* tier a task deserves, when to escalate, how deep to verify. No hook can measure the difficulty of a task — the policy, the session reminder, and the calibration loop carry that part.
- **Detected and reported, not blocked:** environment overrides (`CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_EFFORT_LEVEL`) and organization model allowlists. Requested model ≠ proof it ran; the policy makes the session say so.

## Adapting it to your plan

The shipped hierarchy is **Sonnet → Opus → Fable** with model aliases, so it follows whatever those aliases resolve to on your account. If your plan does not include a tier (or bills it separately), delete that tier's worker files and trim the hierarchy line — the gate keeps working. If your plan offers a single model, route on **effort** instead. Details in [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md).

## Calibration loop

Any routing rule will occasionally be wrong. Keep a project-local file at `.claude/agent-memory-local/adaptive-router/MEMORY.md`, write one line per misroute (*task · sent to · should have been · why*), and once a week ask the session to turn consistent observations into a policy change. The router that improves is the one that learns from *your* misroutes.

## Uninstall

```bash
node scripts/uninstall.js   # --dry-run, --keep-agents
```

Removes the hook entries, the hooks directory, the marked policy section, and only those worker files that still match this repository.

## Origin

This is the routing setup that runs the day-to-day development of [Moshid](https://moshid.com?utm_source=github&utm_medium=readme&utm_campaign=adaptive-router), an Arabic AI-execution platform — published as-is, as a personal configuration. It assumes a plan with access to all three tiers. **Want a router built for *your* plan and *your* usage pattern — interviewed, scanned, and calibrated by your own agent, in Claude Code or Codex?** That is the subject of Moshid's [weekly guide on the subject](https://moshid.com/weekly/adaptive-router?utm_source=github&utm_medium=readme&utm_campaign=adaptive-router) (Arabic).

No support is offered for this repository; issues and pull requests are welcome but may not be answered.

## License

[MIT](LICENSE)
