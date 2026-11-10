import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeClankwall, summarize } from "../src/lib/clankwall";
import { formatIssues } from "../src/schema/validate";
import { EXAMPLES_DIR, DATASET_PATH, INBOX_DIR, ROOT } from "./paths";
import { inboxFiles, loadDataset, loadInboxFile } from "./load";

function fail(label: string, message: string): void {
  console.error(`${label}\n${message}`);
  process.exitCode = 1;
}

const dataset = loadDataset(DATASET_PATH);
if (!dataset.ok) {
  fail(DATASET_PATH, formatIssues(dataset.errors));
} else {
  console.log(
    `dataset ok · events ${dataset.value?.events.length} · snapshots ${dataset.value?.snapshots.length} · accounts ${dataset.value?.accounts.length}`,
  );
}

for (const file of inboxFiles(INBOX_DIR)) {
  const inbox = loadInboxFile(file);
  if (!inbox.ok) fail(file, formatIssues(inbox.errors));
  else console.log(`inbox ok · ${file}`);
}

const examples = readdirSync(EXAMPLES_DIR).filter((name) => name.endsWith(".json"));
for (const name of examples) {
  const file = resolve(EXAMPLES_DIR, name);
  const inbox = loadInboxFile(file);
  if (!inbox.ok) fail(file, formatIssues(inbox.errors));
  else console.log(`example ok · ${name}`);
}

const clankwallPath = resolve(ROOT, "data/clankwall/current.json");
const clankwall = normalizeClankwall(
  JSON.parse(readFileSync(clankwallPath, "utf8")) as unknown,
  "1970-01-01T00:00:00Z",
);
if (!clankwall.ok) {
  fail(clankwallPath, clankwall.errors.join("\n"));
} else {
  const summary = summarize(clankwall.value.accounts);
  console.log(
    `clankwall ok · snapshot ${clankwall.value.snapshot} · ${summary.total} flagged · ${summary.aiFlagged} AI-flagged · ${summary.spamOnly} spam-only`,
  );
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
