import Ajv, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../../data/schema/v1.schema.json";
import type { Account, Dataset, InboxExport, MonitorEvent, Snapshot } from "../lib/types";

export interface SchemaIssue {
  path: string;
  message: string;
}

export interface CheckResult<T> {
  ok: boolean;
  value?: T;
  errors: SchemaIssue[];
}

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
ajv.addSchema(schema);

const datasetValidator = ajv.compile({
  $ref: "https://slop-chop.local/schema/v1.json#/$defs/dataset",
});
const inboxValidator = ajv.compile({
  $ref: "https://slop-chop.local/schema/v1.json#/$defs/inboxExport",
});

const EVENT_ID = /^monitor-new:(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})(?::[a-z0-9-]{1,32})?$/;

function issuesFromAjv(errors: ErrorObject[] | null | undefined): SchemaIssue[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || "/",
    message: error.message ?? "invalid",
  }));
}

function duplicateIds(ids: string[], label: string): SchemaIssue[] {
  const seen = new Set<string>();
  const issues: SchemaIssue[] = [];
  for (const id of ids) {
    if (seen.has(id)) issues.push({ path: label, message: `duplicate id ${id}` });
    seen.add(id);
  }
  return issues;
}

function presentCount(value: number | null | undefined): value is number {
  return typeof value === "number";
}

function eventIssues(event: MonitorEvent): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const match = EVENT_ID.exec(event.id);
  if (!match || match[1] !== event.date || match[2] !== event.slot) {
    issues.push({
      path: `/events/${event.id}`,
      message: "id must embed the same date and slot as the event",
    });
  }
  if (event.handles_complete && event.handles.length !== event.new_blocks) {
    issues.push({
      path: `/events/${event.id}/handles`,
      message: `handles_complete requires ${event.new_blocks} handles, found ${event.handles.length}`,
    });
  }
  if (!event.handles_complete && event.handles.length > event.new_blocks) {
    issues.push({
      path: `/events/${event.id}/handles`,
      message: "handle list is longer than new_blocks",
    });
  }
  const uniqueHandles = new Set(event.handles.map((handle) => handle.toLowerCase()));
  if (uniqueHandles.size !== event.handles.length) {
    issues.push({
      path: `/events/${event.id}/handles`,
      message: "duplicate handle inside one event",
    });
  }
  if (
    presentCount(event.list_size) &&
    presentCount(event.already_blocked) &&
    event.already_blocked + event.new_blocks > event.list_size
  ) {
    issues.push({
      path: `/events/${event.id}`,
      message: "already_blocked + new_blocks cannot exceed list_size",
    });
  }
  return issues;
}

function snapshotIssues(snapshot: Snapshot): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  if (snapshot.id !== `snapshot:${snapshot.as_of}`) {
    issues.push({
      path: `/snapshots/${snapshot.id}`,
      message: "id must equal snapshot: plus as_of",
    });
  }
  if (
    presentCount(snapshot.list_size) &&
    presentCount(snapshot.list_members_blocked) &&
    presentCount(snapshot.list_members_unblocked) &&
    snapshot.list_members_blocked + snapshot.list_members_unblocked !== snapshot.list_size
  ) {
    issues.push({
      path: `/snapshots/${snapshot.id}`,
      message: "list members blocked + unblocked must equal list_size when all three are present",
    });
  }
  return issues;
}

function eventSnapshotIssues(events: MonitorEvent[], snapshots: Snapshot[]): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  for (const event of events) {
    if (!presentCount(event.list_size) || !presentCount(event.already_blocked)) continue;
    const snapshot = snapshots.find((item) => item.as_of === event.as_of);
    if (!snapshot || !presentCount(snapshot.list_members_unblocked)) continue;
    const blockedAfter = event.already_blocked + event.new_blocks;
    if (presentCount(snapshot.list_size) && snapshot.list_size !== event.list_size) {
      issues.push({
        path: `/events/${event.id}`,
        message: `list_size ${event.list_size} does not match snapshot ${snapshot.id}`,
      });
    }
    if (
      presentCount(snapshot.list_members_blocked) &&
      snapshot.list_members_blocked !== blockedAfter
    ) {
      issues.push({
        path: `/events/${event.id}`,
        message: `already_blocked + new_blocks (${blockedAfter}) does not match blocked-on-list on ${snapshot.id}`,
      });
    }
    if (blockedAfter + snapshot.list_members_unblocked !== event.list_size) {
      issues.push({
        path: `/events/${event.id}`,
        message:
          "already_blocked + new_blocks + same-time snapshot unblocked must equal list_size",
      });
    }
  }
  return issues;
}

function accountIssues(account: Account): SchemaIssue[] {
  const expected = `account:${account.handle.toLowerCase()}`;
  if (account.id !== expected) {
    return [
      {
        path: `/accounts/${account.id}`,
        message: `id must be ${expected}`,
      },
    ];
  }
  return [];
}

export function semanticDatasetIssues(dataset: Dataset): SchemaIssue[] {
  const issues = [
    ...duplicateIds(
      dataset.events.map((event) => event.id),
      "/events",
    ),
    ...duplicateIds(
      dataset.snapshots.map((snapshot) => snapshot.id),
      "/snapshots",
    ),
    ...duplicateIds(
      dataset.open_work.map((item) => item.id),
      "/open_work",
    ),
    ...duplicateIds(
      dataset.accounts.map((account) => account.id),
      "/accounts",
    ),
    ...duplicateIds(
      dataset.applied_exports.map((item) => item.export_id),
      "/applied_exports",
    ),
  ];

  const handles = new Set<string>();
  for (const account of dataset.accounts) {
    const key = account.handle.toLowerCase();
    if (handles.has(key)) {
      issues.push({ path: `/accounts/${account.id}`, message: `duplicate handle ${account.handle}` });
    }
    handles.add(key);
    issues.push(...accountIssues(account));
  }

  for (const event of dataset.events) issues.push(...eventIssues(event));
  for (const snapshot of dataset.snapshots) issues.push(...snapshotIssues(snapshot));
  issues.push(...eventSnapshotIssues(dataset.events, dataset.snapshots));

  const activeSlot = new Set<string>();
  for (const event of dataset.events) {
    if (event.status === "superseded") continue;
    const key = `${event.date} ${event.slot}`;
    if (activeSlot.has(key)) {
      issues.push({
        path: `/events/${event.id}`,
        message: `more than one active event for ${key}`,
      });
    }
    activeSlot.add(key);
  }

  const eventsById = new Map(dataset.events.map((event) => [event.id, event]));
  for (const item of dataset.open_work) {
    const event = eventsById.get(item.related_event_id);
    if (!event) {
      issues.push({
        path: `/open_work/${item.id}`,
        message: `related event ${item.related_event_id} does not exist`,
      });
      continue;
    }
    if (event.new_blocks + item.remaining !== item.approved_count) {
      issues.push({
        path: `/open_work/${item.id}`,
        message: "related event new_blocks + remaining must equal approved_count",
      });
    }
  }

  return issues;
}

export function semanticInboxIssues(inbox: InboxExport): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const events = inbox.events ?? [];
  const snapshots = inbox.snapshots ?? [];
  const openWork = inbox.open_work ?? [];
  const accounts = inbox.accounts ?? [];
  if (events.length + snapshots.length + openWork.length + accounts.length === 0) {
    issues.push({ path: "/", message: "export contains no records" });
  }
  issues.push(
    ...duplicateIds(events.map((event) => event.id), "/events"),
    ...duplicateIds(snapshots.map((snapshot) => snapshot.id), "/snapshots"),
    ...duplicateIds(openWork.map((item) => item.id), "/open_work"),
    ...duplicateIds(accounts.map((account) => account.id), "/accounts"),
  );
  for (const event of events) issues.push(...eventIssues(event));
  for (const snapshot of snapshots) issues.push(...snapshotIssues(snapshot));
  issues.push(...eventSnapshotIssues(events, snapshots));
  for (const account of accounts) issues.push(...accountIssues(account));

  const eventsById = new Map(events.map((event) => [event.id, event]));
  for (const item of openWork) {
    const event = eventsById.get(item.related_event_id);
    if (event && event.new_blocks + item.remaining !== item.approved_count) {
      issues.push({
        path: `/open_work/${item.id}`,
        message: "related event new_blocks + remaining must equal approved_count",
      });
    }
  }
  return issues;
}

export function validateDataset(input: unknown): CheckResult<Dataset> {
  const schemaOk = datasetValidator(input);
  const errors = issuesFromAjv(datasetValidator.errors);
  if (!schemaOk) return { ok: false, errors };
  const dataset = input as Dataset;
  const semantic = semanticDatasetIssues(dataset);
  if (semantic.length > 0) return { ok: false, errors: semantic, value: dataset };
  return { ok: true, errors: [], value: dataset };
}

export function validateInbox(input: unknown): CheckResult<InboxExport> {
  const schemaOk = inboxValidator(input);
  const errors = issuesFromAjv(inboxValidator.errors);
  if (!schemaOk) return { ok: false, errors };
  const inbox = input as InboxExport;
  const semantic = semanticInboxIssues(inbox);
  if (semantic.length > 0) return { ok: false, errors: semantic, value: inbox };
  return { ok: true, errors: [], value: inbox };
}

export function formatIssues(errors: SchemaIssue[]): string {
  return errors.map((error) => `${error.path}: ${error.message}`).join("\n");
}
