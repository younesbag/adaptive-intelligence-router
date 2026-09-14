#!/usr/bin/env node
/**
 * Adaptive Intelligence Router — uninstaller
 *
 *   node scripts/uninstall.js [--dry-run] [--keep-agents]
 *
 * Reverses the installer: removes the two hook entries from settings.json, the
 * hooks directory, the marked policy section in CLAUDE.md, and the worker
 * definitions — but only those whose content still matches this repository,
 * so a worker you customised is never deleted. Every changed file is backed up.
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

function removeSettingsHooks() {
  const file = path.join(HOME, "settings.json");
  if (!fs.existsSync(file)) return;
  const settings = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!settings.hooks) return;
  let removed = 0;
  for (const event of Object.keys(settings.hooks)) {
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(
      (entry) => !(entry.hooks || []).some((h) => String(h.command || "").includes("adaptive-router")),
    );
    removed += before - settings.hooks[event].length;
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  if (!removed) return log("settings: no router hooks registered");
  backup(file);
  if (!DRY) fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n", "utf8");
  log(`settings: removed ${removed} hook entr${removed === 1 ? "y" : "ies"}`);
}

function removeHookFiles() {
  const dir = path.join(HOME, "hooks", "adaptive-router");
  if (!fs.existsSync(dir)) return;
  if (!DRY) fs.rmSync(dir, { recursive: true, force: true });
  log(`hooks: removed ${dir}`);
}

function removePolicy() {
  const file = path.join(HOME, "CLAUDE.md");
  if (!fs.existsSync(file)) return;
  const current = fs.readFileSync(file, "utf8");
  if (!current.includes(BEGIN) || !current.includes(END)) return log("policy: no marked section found");
  const start = current.indexOf(BEGIN);
  const stop = current.indexOf(END) + END.length;
  const next = (current.slice(0, start) + current.slice(stop)).replace(/\n{3,}/g, "\n\n");
  backup(file);
  if (!DRY) fs.writeFileSync(file, next, "utf8");
  log("policy: marked section removed");
}

function removeAgents() {
  const src = path.join(REPO, "agents");
  const dst = path.join(HOME, "agents");
  if (!fs.existsSync(dst)) return;
  let removed = 0;
  let kept = 0;
  for (const file of fs.readdirSync(src).filter((f) => f.endsWith(".md"))) {
    const target = path.join(dst, file);
    if (!fs.existsSync(target)) continue;
    const same = fs.readFileSync(target, "utf8") === fs.readFileSync(path.join(src, file), "utf8");
    if (!same) {
      kept++;
      continue;
    }
    if (!DRY) fs.rmSync(target);
    removed++;
  }
  log(`agents: ${removed} removed, ${kept} kept because they were customised`);
}

log(`Adaptive Intelligence Router — uninstaller${DRY ? " (dry run)" : ""}`);
log(`claude home: ${HOME}\n`);
removeSettingsHooks();
removeHookFiles();
removePolicy();
if (!args.has("--keep-agents")) removeAgents();
log("\nDone. Restart Claude Code.");
