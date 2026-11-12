import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { contentHash } from "../src/lib/hash";
import {
  historyEntry,
  normalizeClankwall,
  type ClankwallHistory,
  type ClankwallSnapshot,
} from "../src/lib/clankwall";
import { ROOT } from "./paths";

const CURRENT_PATH = resolve(ROOT, "data/clankwall/current.json");
const HISTORY_PATH = resolve(ROOT, "data/clankwall/history.json");
const INBOX_DIR = resolve(ROOT, "data/clankwall/inbox");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function loadCurrent(): ClankwallSnapshot | null {
  try {
    const raw = readJson(CURRENT_PATH) as { imported_at?: string };
    const parsed = normalizeClankwall(raw, raw.imported_at ?? new Date(0).toISOString());
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

function loadHistory(): ClankwallHistory {
  try {
    const parsed = readJson(HISTORY_PATH) as ClankwallHistory;
    if (parsed?.schema_version === "1.0.0" && Array.isArray(parsed.entries)) return parsed;
  } catch {
    // A missing history file is the first import.
  }
  return { schema_version: "1.0.0", entries: [] };
}

const check = process.argv.includes("--check");
const importedAt = new Date().toISOString();
mkdirSync(INBOX_DIR, { recursive: true });
const files = readdirSync(INBOX_DIR)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => resolve(INBOX_DIR, name));

if (files.length === 0) {
  console.error("data/clankwall/inbox has no JSON snapshot.");
  process.exit(1);
}

const incoming: ClankwallSnapshot[] = [];
for (const file of files) {
  const parsed = normalizeClankwall(readJson(file), importedAt);
  if (!parsed.ok) {
    console.error(`${file} is not a valid Clankwall snapshot.\n${parsed.errors.join("\n")}`);
    console.error("Last known good snapshot was left unchanged.");
    process.exit(1);
  }
  incoming.push(parsed.value);
}
incoming.sort((a, b) => a.generated_at.localeCompare(b.generated_at) || a.snapshot.localeCompare(b.snapshot));

const history = loadHistory();
const current = loadCurrent();
let next = current;
let changed = false;
for (const snapshot of incoming) {
  const digest = contentHash(snapshot.accounts);
  if (current && current.snapshot === snapshot.snapshot && contentHash(current.accounts) === digest) {
    continue;
  }
  const stamped =
    current && current.snapshot === snapshot.snapshot
      ? { ...snapshot, imported_at: current.imported_at }
      : snapshot;
  next = stamped;
  if (!history.entries.some((entry) => entry.snapshot === stamped.snapshot)) {
    history.entries.push(historyEntry(stamped));
  }
  changed = true;
}

if (!next) {
  console.error("No valid Clankwall snapshot to write.");
  process.exit(1);
}

if (check) {
  if (changed || !current) {
    console.error("data/clankwall/current.json is out of date. Run npm run clankwall:ingest.");
    process.exit(1);
  }
  console.log(`Clankwall snapshot ${current.snapshot} matches inbox.`);
  process.exit(0);
}

if (!changed && current) {
  console.log(`No changes. Snapshot ${current.snapshot} was already applied.`);
  process.exit(0);
}

writeFileSync(CURRENT_PATH, `${JSON.stringify(next, null, 2)}\n`);
writeFileSync(HISTORY_PATH, `${JSON.stringify(history, null, 2)}\n`);
console.log(
  `Updated Clankwall snapshot ${next.snapshot} · ${next.total} accounts · history ${history.entries.length}`,
);
