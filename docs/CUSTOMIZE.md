# Adapting the router to your plan and your work

The shipped configuration assumes access to three tiers — Sonnet, Opus, Fable — via their aliases. Everything below keeps the gate and the installer working unchanged.

## Your plan lacks a tier (or bills it separately)

1. Delete that tier's worker files from `agents/` (e.g. all `router-fable-*.md`).
2. In `policy/adaptive-router.md`, shorten the hierarchy line and remove the tier's bullet from the worker pool and from the verification-routing line (route its cases to the highest tier you keep).
3. Remove the deleted files from `EXPECTED_WORKERS` in `hooks/session-start.js` so the preflight does not warn about them.
4. Re-run `node scripts/install.js` (unchanged files are skipped; the policy section is replaced in place).

The gate validates worker *naming*, not tier availability, so nothing else changes.

## Your plan offers a single model

Route on **effort** instead of model: keep one tier's files (say `router-sonnet-*`), and rewrite the routing table in the policy in terms of effort — low for mechanical transforms, medium by default, high/xhigh for genuinely hard work — plus verification depth. The scarce resource is still your usage window; the highest effort on everything burns it exactly like the strongest model on everything.

## Adding a tier or a level

Copy any worker file, change `name`, `model`, `effort`, and the one-line description. Keep the worker body intact — it is the escalation contract. If you add a model alias the gate does not know, extend the `POOL` regex and `TIERS` list in `hooks/gate.js` and add a test.

## Restricting or relaxing the gate

- `ROUTER_GATE_ALLOW_GENERAL=1` allows `general-purpose` / `claude` (they inherit the parent model; use only if a workflow of yours depends on them).
- To block additional agent names, add them to `CATCH_ALL` in `hooks/gate.js`.
- To make the gate advisory instead of blocking, change `process.exit(2)` to `process.exit(0)` in `block()` — the message will then be lost; prefer keeping it blocking.

## Tuning the reminder

`REMINDER` in `hooks/session-start.js` is the one paragraph re-injected every session and after every compaction. Keep it under ~600 characters: a reminder that is too long competes with the work itself.

## Keeping it alive

Model names change; aliases mostly survive. Once a month, ask your session: *“Are all model aliases and worker files in the routing policy still valid on this account?”* — and update whatever changed. Keep misroutes in the project-local calibration file so the weekly review has evidence to work from.
