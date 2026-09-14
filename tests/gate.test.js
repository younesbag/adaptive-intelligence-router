"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const GATE = path.join(__dirname, "..", "hooks", "gate.js");

function run(payload, env = {}) {
  const input = typeof payload === "string" ? payload : JSON.stringify(payload);
  const result = spawnSync(process.execPath, [GATE], {
    input,
    encoding: "utf8",
    env: { ...process.env, ROUTER_GATE_ALLOW_GENERAL: "", ...env },
  });
  return { code: result.status, stderr: result.stderr };
}

function call(subagent_type, model) {
  const tool_input = { subagent_type, prompt: "x", description: "x" };
  if (model !== undefined) tool_input.model = model;
  return { tool_name: "Agent", tool_input };
}

test("allows a pool worker invoked with its matching alias", () => {
  assert.equal(run(call("router-sonnet-medium", "sonnet")).code, 0);
});

test("allows full model ids and alias variants for the tier", () => {
  assert.equal(run(call("router-opus-high", "claude-opus-5")).code, 0);
  assert.equal(run(call("router-sonnet-high", "sonnet[1m]")).code, 0);
  assert.equal(run(call("router-fable-max", "Fable")).code, 0);
});

test("blocks Haiku for any agent", () => {
  const r = run(call("router-sonnet-low", "haiku"));
  assert.equal(r.code, 2);
  assert.match(r.stderr, /Haiku/);
  assert.equal(run(call("some-plugin:reviewer", "claude-haiku-4-5")).code, 2);
});

test("blocks a pool worker invoked without an explicit model", () => {
  const r = run(call("router-opus-medium"));
  assert.equal(r.code, 2);
  assert.match(r.stderr, /explicit model/);
});

test("blocks a tier mismatch and names the fix", () => {
  const r = run(call("router-sonnet-medium", "opus"));
  assert.equal(r.code, 2);
  assert.match(r.stderr, /router-opus-<effort>/);
});

test("Explore must run on sonnet", () => {
  assert.equal(run(call("Explore")).code, 2);
  assert.equal(run(call("Explore", "opus")).code, 2);
  assert.equal(run(call("Explore", "sonnet")).code, 0);
});

test("blocks catch-all agents by default", () => {
  assert.equal(run(call("general-purpose")).code, 2);
  assert.equal(run(call("claude", "opus")).code, 2);
});

test("allows catch-all agents when ROUTER_GATE_ALLOW_GENERAL=1", () => {
  assert.equal(run(call("general-purpose"), { ROUTER_GATE_ALLOW_GENERAL: "1" }).code, 0);
});

test("allows specialised and plugin agents (non-Haiku)", () => {
  assert.equal(run(call("some-plugin:reviewer", "opus")).code, 0);
  assert.equal(run(call("statusline-setup")).code, 0);
});

test("also guards the legacy Task tool name", () => {
  assert.equal(run({ tool_name: "Task", tool_input: { subagent_type: "router-sonnet-low" } }).code, 2);
});

test("ignores tools other than Agent/Task", () => {
  assert.equal(run({ tool_name: "Bash", tool_input: { command: "ls" } }).code, 0);
});

test("tolerates a UTF-8 BOM and CRLF from Windows shells", () => {
  const r = run("﻿" + JSON.stringify(call("router-sonnet-low", "haiku")) + "\r\n");
  assert.equal(r.code, 2);
  assert.match(r.stderr, /Haiku/);
});

test("fails open on malformed input", () => {
  assert.equal(run("this is not json").code, 0);
  assert.equal(run("").code, 0);
});
