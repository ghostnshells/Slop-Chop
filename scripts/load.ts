import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Dataset, InboxExport } from "../src/lib/types";
import { validateDataset, validateInbox, type CheckResult } from "../src/schema/validate";

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export function loadDataset(path: string): CheckResult<Dataset> {
  return validateDataset(readJson(path));
}

export function inboxFiles(directory: string): string[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => resolve(directory, name));
}

export function loadInboxFile(path: string): CheckResult<InboxExport> {
  return validateInbox(readJson(path));
}
