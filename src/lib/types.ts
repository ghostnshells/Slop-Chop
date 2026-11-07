export const SCHEMA_VERSION = "1.0.0" as const;
export const DATASET_ID = "slop-chop.block-monitor" as const;
export const MONITOR_TIMEZONE = "America/New_York" as const;

export type EventStatus = "complete" | "partial" | "superseded";
export type OpenWorkStatus = "open" | "interrupted" | "done";
export type BlockState = "blocked" | "not_blocked" | "unknown";
export type CollectionName = "events" | "snapshots" | "open_work" | "accounts";

export interface MonitorEvent {
  id: string;
  kind: "monitor_new_blocks";
  date: string;
  slot: string;
  as_of: string;
  source: string;
  provenance: string;
  status: EventStatus;
  new_blocks: number;
  list_size?: number | null;
  already_blocked?: number | null;
  approval_id?: string | null;
  handles: string[];
  handles_complete: boolean;
  notes: string;
}

export interface Snapshot {
  id: string;
  as_of: string;
  source: string;
  provenance: string;
  completeness: "point_in_time";
  list_size?: number | null;
  list_members_blocked?: number | null;
  list_members_unblocked?: number | null;
  x_blocks_total?: number | null;
  notes: string;
}

export interface OpenWork {
  id: string;
  as_of: string;
  source: string;
  provenance: string;
  status: OpenWorkStatus;
  approved_count: number;
  remaining: number;
  related_event_id: string;
  notes: string;
}

export interface ProfileSnapshot {
  as_of: string;
  source: string;
  provenance: string;
  lifetime_posts?: number | null;
  followers?: number | null;
  following?: number | null;
  created_on?: string | null;
  display_name?: string | null;
}

export interface ListMembership {
  as_of: string;
  source: string;
  provenance: string;
  on_list: boolean;
}

export interface BlockRecord {
  as_of: string;
  source: string;
  provenance: string;
  state: BlockState;
  event_id?: string | null;
}

export interface Account {
  id: string;
  handle: string;
  profile?: ProfileSnapshot | null;
  list_membership?: ListMembership | null;
  block?: BlockRecord | null;
}

export interface Revision {
  id: string;
  at: string;
  export_id: string;
  collection: CollectionName;
  record_id: string;
  op: "insert" | "replace";
  previous_hash: string | null;
  next_hash: string;
}

export interface AppliedExport {
  export_id: string;
  content_hash: string;
  applied_at: string;
}

export interface Dataset {
  schema_version: typeof SCHEMA_VERSION;
  dataset_id: typeof DATASET_ID;
  updated_at: string;
  compiler: { name: string; version: string };
  provenance: { summary: string; sources: string[] };
  subject: { handle: string; display_name?: string | null };
  list: { name: string; description: string; url?: string | null };
  monitoring: {
    started_on: string;
    timezone: typeof MONITOR_TIMEZONE;
    preexisting_blocked_excluded: number;
    preexisting_note: string;
  };
  events: MonitorEvent[];
  snapshots: Snapshot[];
  open_work: OpenWork[];
  accounts: Account[];
  revisions: Revision[];
  applied_exports: AppliedExport[];
}

export interface InboxExport {
  schema_version: typeof SCHEMA_VERSION;
  export_id: string;
  exported_at: string;
  exported_by: string;
  source: string;
  provenance: string;
  events?: MonitorEvent[];
  snapshots?: Snapshot[];
  open_work?: OpenWork[];
  accounts?: Account[];
}

export interface DayAggregate {
  date: string;
  newBlocks: number;
  completeNewBlocks: number;
  partialNewBlocks: number;
  status: "complete" | "partial";
  cumulativeRecorded: number;
  cumulativeComplete: number;
  events: MonitorEvent[];
}

export interface Aggregates {
  days: DayAggregate[];
  completeNewBlocks: number;
  partialNewBlocks: number;
  recordedNewBlocks: number;
  preexistingBlockedExcluded: number;
  lastCompleteDate: string | null;
  latestEventAsOf: string | null;
}
