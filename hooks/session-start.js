#!/usr/bin/env node
/**
 * Adaptive Intelligence Router — session preflight + policy reminder
 * Claude Code hook: SessionStart (startup, resume, clear, compact)
 *
 * Whatever this script prints to stdout is added to the session context.
 * Two jobs:
 *   1. Re-inject a compact statement of the policy at every session start —
 *      and again after every context compaction, which is exactly when long
 *      sessions tend to forget early instructions.
 *   2. Preflight: detect anything that silently defeats routing (environment
 *      overrides, missing worker definitions) and say so explicitly.
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const HOME = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");

const EXPECTED_WORKERS = [
  "Explore.md",
  "router-sonnet-low.md",
  "router-sonnet-medium.md",
  "router-sonnet-high.md",
  "router-sonnet-xhigh.md",
  "router-opus-medium.md",
  "router-opus-high.md",
  "router-opus-xhigh.md",
  "router-fable-medium.md",
  "router-fable-high.md",
  "router-fable-xhigh.md",
  "router-fable-max.md",
];

const REMINDER =
  "[adaptive-router] Routing policy is active. Delegate bounded work to the cheapest model × effort " +
  "that succeeds on the first attempt; route by cognitive difficulty, not task size; the cheapest agent " +
  "is often no agent. Pool: router-<sonnet|opus|fable>-<effort> and Explore — always pass `model` explicitly. " +
  "Never Haiku (a PreToolUse gate blocks it). Workers escalate instead of bluffing. Verification depth " +
  "scales with risk × uncertainty × blast radius. Requested model ≠ proof it ran — report substitutions.";

function preflight() {
  const warnings = [];

  for (const name of ["CLAUDE_CODE_SUBAGENT_MODEL", "CLAUDE_CODE_EFFORT_LEVEL"]) {
    if (process.env[name]) {
      warnings.push(
        `${name}=${process.env[name]} is set and overrides routing — say so once and continue with the best achievable behavior`,
      );
    }
  }

  const agentsDir = path.join(HOME, "agents");
  try {
    const present = new Set(fs.readdirSync(agentsDir));
    const missing = EXPECTED_WORKERS.filter((f) => !present.has(f));
    if (missing.length) warnings.push(`missing worker definitions in ${agentsDir}: ${missing.join(", ")}`);
  } catch {
    warnings.push(`no agents directory at ${agentsDir} — run the installer (node scripts/install.js)`);
  }

  return warnings;
}

function main() {
  try {
    fs.readFileSync(0, "utf8"); // drain stdin; payload is not needed
  } catch {
    /* no stdin */
  }

  const lines = [REMINDER];
  const warnings = preflight();
  if (warnings.length) lines.push(`[adaptive-router] PREFLIGHT WARNINGS: ${warnings.join(" | ")}`);
  process.stdout.write(lines.join("\n") + "\n");
}

main();
