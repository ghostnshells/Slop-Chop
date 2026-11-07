import { resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "..");
export const DATASET_PATH = resolve(ROOT, "data/dataset.json");
export const INBOX_DIR = resolve(ROOT, "data/inbox");
export const EXAMPLES_DIR = resolve(ROOT, "data/examples");
