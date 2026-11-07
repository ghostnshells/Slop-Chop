import { contentHash } from "../lib/hash";
import type {
  Account,
  Dataset,
  InboxExport,
  MonitorEvent,
  OpenWork,
  Revision,
  Snapshot,
} from "../lib/types";
import { validateDataset } from "../schema/validate";

export class IngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestError";
  }
}

type RecordItem = MonitorEvent | Snapshot | OpenWork | Account;

function sortBy<T>(items: T[], keys: Array<(item: T) => string>): T[] {
  return items.slice().sort((a, b) => {
    for (const key of keys) {
      const compared = key(a).localeCompare(key(b));
      if (compared !== 0) return compared;
    }
    return 0;
  });
}

function upsert<T extends RecordItem>(
  current: T[],
  incoming: T[],
  collection: Revision["collection"],
  exportId: string,
  at: string,
  revisions: Revision[],
): T[] {
  const next = current.slice();
  for (const record of incoming) {
    const index = next.findIndex((item) => item.id === record.id);
    const nextHash = contentHash(record);
    if (index === -1) {
      revisions.push({
        id: `rev:${exportId}:${collection}:${record.id}:insert`,
        at,
        export_id: exportId,
        collection,
        record_id: record.id,
        op: "insert",
        previous_hash: null,
        next_hash: nextHash,
      });
      next.push(record);
      continue;
    }
    const previousHash = contentHash(next[index]);
    if (previousHash === nextHash) continue;
    revisions.push({
      id: `rev:${exportId}:${collection}:${record.id}:replace`,
      at,
      export_id: exportId,
      collection,
      record_id: record.id,
      op: "replace",
      previous_hash: previousHash,
      next_hash: nextHash,
    });
    next[index] = record;
  }
  return next;
}

export function mergeDataset(
  dataset: Dataset,
  inbox: InboxExport,
  now = new Date(),
): Dataset {
  const digest = contentHash(inbox);
  const prior = dataset.applied_exports.find((item) => item.export_id === inbox.export_id);
  if (prior) {
    if (prior.content_hash !== digest) {
      throw new IngestError(
        `Export ${inbox.export_id} was already applied with a different body. Use a new export_id and upsert the corrected record ids.`,
      );
    }
    return dataset;
  }

  const at = now.toISOString();
  const revisions = dataset.revisions.slice();
  const events = sortBy(
    upsert(dataset.events, inbox.events ?? [], "events", inbox.export_id, at, revisions),
    [(event) => event.date, (event) => event.slot, (event) => event.id],
  );
  const snapshots = sortBy(
    upsert(
      dataset.snapshots,
      inbox.snapshots ?? [],
      "snapshots",
      inbox.export_id,
      at,
      revisions,
    ),
    [(snapshot) => snapshot.as_of, (snapshot) => snapshot.id],
  );
  const openWork = sortBy(
    upsert(
      dataset.open_work,
      inbox.open_work ?? [],
      "open_work",
      inbox.export_id,
      at,
      revisions,
    ),
    [(item) => item.as_of, (item) => item.id],
  );
  const accounts = sortBy(
    upsert(
      dataset.accounts,
      inbox.accounts ?? [],
      "accounts",
      inbox.export_id,
      at,
      revisions,
    ),
    [(account) => account.handle.toLowerCase(), (account) => account.id],
  );

  const changed = revisions.length !== dataset.revisions.length;
  const next: Dataset = {
    ...dataset,
    updated_at: changed ? at : dataset.updated_at,
    compiler: changed
      ? { name: "slop-chop-ingest", version: "1.0.0" }
      : dataset.compiler,
    events,
    snapshots,
    open_work: openWork,
    accounts,
    revisions,
    applied_exports: [
      ...dataset.applied_exports,
      { export_id: inbox.export_id, content_hash: digest, applied_at: at },
    ],
  };

  const checked = validateDataset(next);
  if (!checked.ok || !checked.value) {
    throw new IngestError(
      `Merged dataset is invalid.\n${checked.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join("\n")}`,
    );
  }
  return checked.value;
}

export function datasetChanged(before: Dataset, after: Dataset): boolean {
  return contentHash(before) !== contentHash(after);
}
