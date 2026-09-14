# Changelog

## 1.0.0 — 2026-09-14

First public release.

- One-page routing policy: route by cognitive difficulty, cheapest model × effort that succeeds first try, escalate instead of bluffing, verification depth by risk, honesty about routes, calibration loop.
- 12 worker definitions: `router-sonnet-{low,medium,high,xhigh}`, `router-opus-{medium,high,xhigh}`, `router-fable-{medium,high,xhigh,max}`, and `Explore`.
- `hooks/gate.js` — PreToolUse gate on the Agent tool: blocks Haiku, unqualified pool invocations, tier mismatches, and catch-all agents.
- `hooks/session-start.js` — policy reminder at every session start and after compaction, plus preflight warnings for environment overrides and missing workers.
- Idempotent installer and uninstaller with timestamped backups; test suite for the gate.
