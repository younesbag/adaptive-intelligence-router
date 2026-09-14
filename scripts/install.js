#!/usr/bin/env node
/**
 * Adaptive Intelligence Router — installer (user level, all projects)
 *
 *   node scripts/install.js [--dry-run] [--no-agents] [--no-hooks] [--no-policy] [--force-policy]
 *
 * Idempotent and reversible:
 *   - every existing file it changes gets a timestamped .bak-* copy next to it
 *   - agents:   copies the worker definitions into <claude-home>/agents/
 *   - hooks:    copies gate.js + session-start.js into <claude-home>/hooks/adaptive-router/
 *               and merges two hook entries into <claude-home>/settings.json
 *   - policy:   appends the routing policy to <claude-home>/CLAUDE.md between markers
 *
 * <claude-home> is $CLAUDE_CONFIG_DIR or ~/.claude.
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const REPO = path.resolve(__dirname, "..");
const HOME = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");

const BEGIN = "<!-- adaptive-router:begin -->";
const END = "<!-- adaptive-router:end -->";

const log = (m) => console.log(m);

function backup(file) {
  if (!fs.existsSync(file)) return;
  const copy = `${file}.bak-${STAMP}`;
  if (!DRY) fs.copyFileSync(file, copy);
  log(`  backup → ${copy}`);
}

function write(file, content) {
  if (DRY) {
    log(`  [dry-run] would write ${file}`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function installAgents() {
  const src = path.join(REPO, "agents");
  const dst = path.join(HOME, "agents");
  let written = 0;
  let unchanged = 0;
  for (const file of fs.readdirSync(src).filter((f) => f.endsWith(".md"))) {
    const content = fs.readFileSync(path.join(src, file), "utf8");
    const target = path.join(dst, file);
    if (fs.existsSync(target)) {
      if (fs.readFileSync(target, "utf8") === content) {
        unchanged++;
        continue;
      }
      backup(target);
    }
    write(target, content);
    written++;
  }
  log(`agents: ${written} written, ${unchanged} already up to date → ${dst}`);
}

function installHookFiles() {
  const dst = path.join(HOME, "hooks", "adaptive-router");
  for (const file of ["gate.js", "session-start.js"]) {
    write(path.join(dst, file), fs.readFileSync(path.join(REPO, "hooks", file), "utf8"));
  }
  log(`hooks: gate.js + session-start.js → ${dst}`);
  return dst;
}

function installSettings(hooksDir) {
  const file = path.join(HOME, "settings.json");
  let settings = {};
  if (fs.existsSync(file)) {
    try {
      settings = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      throw new Error(`${file} is not valid JSON — fix it before installing (${err.message})`);
    }
  }
  settings.hooks = settings.hooks || {};

  const command = (f) => `node "${toPosix(path.join(hooksDir, f))}"`;
  let changed = false;

  const ensure = (event, matcher, cmd) => {
    const list = (settings.hooks[event] = settings.hooks[event] || []);
    const present = list.some((entry) =>
      (entry.hooks || []).some((h) => String(h.command || "").includes("adaptive-router")),
    );
    if (present) {
      log(`  ${event}: already installed`);
      return;
    }
    const entry = { hooks: [{ type: "command", command: cmd, timeout: 10 }] };
    if (matcher) entry.matcher = matcher;
    list.push(entry);
    changed = true;
    log(`  ${event}: added`);
  };

  ensure("PreToolUse", "Agent|Task", command("gate.js"));
  ensure("SessionStart", null, command("session-start.js"));

  if (!changed) return;
  backup(file);
  write(file, JSON.stringify(settings, null, 2) + "\n");
  log(`settings: hooks registered in ${file}`);
}

function installPolicy() {
  const file = path.join(HOME, "CLAUDE.md");
  const policy = fs.readFileSync(path.join(REPO, "policy", "adaptive-router.md"), "utf8").trim();
  const section = `${BEGIN}\n${policy}\n${END}\n`;
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";

  if (current.includes(BEGIN) && current.includes(END)) {
    const start = current.indexOf(BEGIN);
    const stop = current.indexOf(END) + END.length;
    const next = current.slice(0, start) + section.trimEnd() + current.slice(stop);
    if (next === current) {
      log("policy: already up to date");
      return;
    }
    backup(file);
    write(file, next);
    log(`policy: section updated in ${file}`);
    return;
  }

  if (/Adaptive Intelligence Router/.test(current) && !args.has("--force-policy")) {
    log(
      `policy: ${file} already contains a routing policy without markers — left untouched ` +
        `(merge by hand, or re-run with --force-policy to append a marked section anyway)`,
    );
    return;
  }

  backup(file);
  const prefix = current.trim() ? current.replace(/\s*$/, "\n\n") : "";
  write(file, prefix + section);
  log(`policy: appended to ${file}`);
}

function main() {
  log(`Adaptive Intelligence Router — installer${DRY ? " (dry run)" : ""}`);
  log(`claude home: ${HOME}\n`);

  if (!args.has("--no-agents")) installAgents();
  if (!args.has("--no-hooks")) installSettings(installHookFiles());
  if (!args.has("--no-policy")) installPolicy();

  log(
    "\nDone. Restart Claude Code — hooks and a brand-new agents directory are read at session start.\n" +
      "Verify: ask “What routing policy is active?”, then try delegating to model \"haiku\" — the gate must block it.",
  );
}

try {
  main();
} catch (err) {
  console.error(`install failed: ${err.message}`);
  process.exit(1);
}
