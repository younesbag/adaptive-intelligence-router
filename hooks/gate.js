#!/usr/bin/env node
/**
 * Adaptive Intelligence Router — delegation gate
 * Claude Code hook: PreToolUse, matcher "Agent|Task"
 *
 * Mechanically enforces the hard routing rules on every subagent invocation:
 *   1. Haiku is never used for delegated work.
 *   2. Router pool workers (router-<tier>-<effort>) and Explore must be invoked
 *      with an explicit `model` parameter that matches their tier.
 *   3. Catch-all agents (general-purpose / claude) are blocked by default: they
 *      inherit the parent model and bypass routing entirely.
 *      Set ROUTER_GATE_ALLOW_GENERAL=1 to allow them.
 *
 * Hook contract: exit 0 = allow, exit 2 = block (stderr is shown to the model,
 * which then re-issues the call correctly). The gate fails OPEN on malformed
 * input so it can never break an unrelated workflow.
 */
"use strict";

const fs = require("fs");

const POOL = /^router-(sonnet|opus|fable)-(low|medium|high|xhigh|max)$/;
const EXPLORE = "Explore";
const CATCH_ALL = new Set(["general-purpose", "claude"]);
const TIERS = ["sonnet", "opus", "fable"];

function block(reason) {
  process.stderr.write(`[adaptive-router] BLOCKED — ${reason}\n`);
  process.exit(2);
}

function matchesTier(model, tier) {
  return (
    model === tier ||
    model.startsWith(`${tier}[`) || // alias variants such as sonnet[1m]
    model.startsWith(`${tier}-`) || // e.g. opus-5
    model.startsWith(`claude-${tier}`) // full model ids, e.g. claude-opus-5
  );
}

function tierOf(model) {
  return TIERS.find((t) => matchesTier(model, t)) || null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    return; // fail open
  }

  const toolName = payload && payload.tool_name;
  if (toolName !== "Agent" && toolName !== "Task") return;

  const input = (payload && payload.tool_input) || {};
  const agent = String(input.subagent_type || "").trim();
  const rawModel = input.model == null ? "" : String(input.model);
  const model = rawModel.trim().toLowerCase();

  if (model.includes("haiku")) {
    block(
      `model "${rawModel}" — Haiku is never used for delegated work. ` +
        `Re-issue with model: "sonnet" (or "opus" / "fable" for harder work).`,
    );
  }

  const pool = POOL.exec(agent);
  if (pool) {
    const tier = pool[1];
    if (!model) {
      block(
        `${agent} was invoked without an explicit model. ` +
          `Pass model: "${tier}" so the route cannot drift from the worker definition.`,
      );
    }
    if (!matchesTier(model, tier)) {
      const actual = tierOf(model);
      block(
        `${agent} is a ${tier} worker but was invoked with model "${rawModel}". ` +
          (actual
            ? `Either pass model: "${tier}", or pick router-${actual}-<effort>.`
            : `Pass model: "${tier}".`),
      );
    }
    return;
  }

  if (agent === EXPLORE) {
    if (!model) {
      block(
        `Explore was invoked without an explicit model. Pass model: "sonnet" — ` +
          `read-only discovery must not inherit the parent model.`,
      );
    }
    if (!matchesTier(model, "sonnet")) {
      block(`Explore runs on sonnet only, got "${rawModel}". Pass model: "sonnet".`);
    }
    return;
  }

  if (CATCH_ALL.has(agent) && process.env.ROUTER_GATE_ALLOW_GENERAL !== "1") {
    block(
      `"${agent}" inherits the parent model and bypasses routing. ` +
        `Use router-<sonnet|opus|fable>-<effort> (or Explore for read-only discovery). ` +
        `Set ROUTER_GATE_ALLOW_GENERAL=1 to allow catch-all agents.`,
    );
  }
}

main();
