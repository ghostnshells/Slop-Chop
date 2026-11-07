import { writeFileSync } from "node:fs";
import { contentHash } from "../src/lib/hash";
import type { Dataset, InboxExport } from "../src/lib/types";
import { datasetChanged, mergeDataset } from "../src/ingest/merge";
import { formatIssues } from "../src/schema/validate";
import { DATASET_PATH, INBOX_DIR } from "./paths";
import { inboxFiles, loadDataset, loadInboxFile } from "./load";

function die(message: string): never {
  console.error(message);
  process.exit(1);
}

const check = process.argv.includes("--check");
const loaded = loadDataset(DATASET_PATH);
if (!loaded.ok || !loaded.value) {
  die(`Dataset is invalid.\n${formatIssues(loaded.errors)}`);
}

const files = inboxFiles(INBOX_DIR);
const exports: InboxExport[] = [];
for (const file of files) {
  const inbox = loadInboxFile(file);
  if (!inbox.ok || !inbox.value) {
    die(`${file} is invalid.\n${formatIssues(inbox.errors)}`);
  }
  exports.push(inbox.value);
}
exports.sort(
  (a, b) => a.exported_at.localeCompare(b.exported_at) || a.export_id.localeCompare(b.export_id),
);

let next: Dataset = loaded.value;
try {
  for (const inbox of exports) next = mergeDataset(next, inbox);
} catch (error) {
  die(error instanceof Error ? error.message : String(error));
}

const changed = datasetChanged(loaded.value, next);
if (check) {
  if (changed) {
    die(
      "data/dataset.json is out of date with data/inbox. Run npm run ingest and commit dataset.json plus the inbox file.",
    );
  }
  console.log("Dataset matches inbox.");
  process.exit(0);
}

if (!changed) {
  console.log("No changes. Inbox exports were already applied.");
  process.exit(0);
}

writeFileSync(DATASET_PATH, `${JSON.stringify(next, null, 2)}\n`);
console.log(
  `Updated ${DATASET_PATH} · hash ${contentHash(next).slice(0, 12)} · events ${next.events.length} · accounts ${next.accounts.length}`,
);
