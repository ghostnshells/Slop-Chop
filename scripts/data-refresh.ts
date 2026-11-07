import { formatIssues } from "../src/schema/validate";
import { DATASET_PATH, INBOX_DIR } from "./paths";
import { inboxFiles, loadDataset, loadInboxFile } from "./load";

const source = (process.env.DATA_REFRESH_SOURCE ?? "").trim();

if (source === "" || source === "none" || source === "unset") {
  console.log(
    "No authorized data source configured. Skipping. This workflow does not poll X or any external API.",
  );
  process.exit(0);
}

if (source !== "inbox") {
  console.error(
    'DATA_REFRESH_SOURCE must be "inbox" to validate files already committed in data/inbox. External fetches are disabled.',
  );
  process.exit(1);
}

const dataset = loadDataset(DATASET_PATH);
if (!dataset.ok) {
  console.error(`Dataset is invalid.\n${formatIssues(dataset.errors)}`);
  process.exit(1);
}

const files = inboxFiles(INBOX_DIR);
if (files.length === 0) {
  console.log("DATA_REFRESH_SOURCE=inbox and data/inbox has no JSON files. Nothing to validate.");
  process.exit(0);
}

let failed = false;
for (const file of files) {
  const inbox = loadInboxFile(file);
  if (!inbox.ok) {
    failed = true;
    console.error(`${file}\n${formatIssues(inbox.errors)}`);
  } else {
    console.log(`valid ${file}`);
  }
}

if (failed) process.exit(1);

console.log(
  "Inbox files are structurally valid. This workflow does not merge, push, or publish. Run npm run ingest on a branch and open a pull request.",
);
