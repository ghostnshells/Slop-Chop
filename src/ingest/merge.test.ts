import { describe, expect, it } from "vitest";
import raw from "../../data/dataset.json";
import { aggregate } from "../lib/aggregates";
import { contentHash } from "../lib/hash";
import type { Dataset, InboxExport, MonitorEvent } from "../lib/types";
import { validateDataset } from "../schema/validate";
import { IngestError, mergeDataset } from "./merge";

const base = validateDataset(structuredClone(raw)).value as Dataset;

function event(newBlocks: number, id = "monitor-new:2026-11-07:09:00"): MonitorEvent {
  return {
    id,
    kind: "monitor_new_blocks",
    date: "2026-11-07",
    slot: "09:00",
    as_of: "2026-11-07T09:00:00-05:00",
    source: "routine-journal",
    provenance: "Unit test journal entry for ingest behavior.",
    status: "complete",
    new_blocks: newBlocks,
    handles: [],
    handles_complete: false,
    notes: `Test count ${newBlocks}.`,
  };
}

function inbox(exportId: string, events: MonitorEvent[]): InboxExport {
  return {
    schema_version: "1.0.0",
    export_id: exportId,
    exported_at: "2026-11-07T15:00:00Z",
    exported_by: "test",
    source: "routine-journal",
    provenance: "Unit test export. Not a live observation.",
    events,
  };
}

describe("idempotent ingest", () => {
  const now = new Date("2026-11-07T16:00:00Z");
  const first = mergeDataset(base, inbox("2026-11-07.test-add", [event(3)]), now);

  it("applies a new event once and ignores an exact resubmit", () => {
    const second = mergeDataset(first, inbox("2026-11-07.test-add", [event(3)]), new Date("2026-11-08T00:00:00Z"));
    expect(contentHash(second)).toBe(contentHash(first));
    expect(second.applied_exports).toHaveLength(1);
    expect(aggregate(first).completeNewBlocks).toBe(453);
    expect(aggregate(second).recordedNewBlocks).toBe(aggregate(first).recordedNewBlocks);
  });

  it("replaces the same event id instead of adding another copy", () => {
    const fixed = mergeDataset(
      first,
      inbox("2026-11-07.test-fix", [event(4)]),
      new Date("2026-11-07T18:00:00Z"),
    );
    expect(fixed.events.filter((item) => item.date === "2026-11-07")).toHaveLength(1);
    expect(aggregate(fixed).completeNewBlocks).toBe(454);
    expect(fixed.revisions.some((revision) => revision.op === "replace")).toBe(true);
  });

  it("refuses to reuse an export id for a different body", () => {
    expect(() => mergeDataset(first, inbox("2026-11-07.test-add", [event(9)]))).toThrow(IngestError);
    expect(aggregate(first).completeNewBlocks).toBe(453);
  });

  it("keeps a superseded row without counting it beside its replacement", () => {
    const oldRow = event(50, "monitor-new:2026-11-07:10:00:old");
    oldRow.slot = "10:00";
    oldRow.as_of = "2026-11-07T10:00:00-05:00";
    oldRow.status = "superseded";
    const active = event(2, "monitor-new:2026-11-07:10:00");
    active.slot = "10:00";
    active.as_of = "2026-11-07T10:00:00-05:00";
    const next = mergeDataset(base, inbox("2026-11-07.test-supersede", [oldRow, active]), now);
    const day = aggregate(next).days.find((item) => item.date === "2026-11-07");
    expect(day?.newBlocks).toBe(2);
    expect(next.events.some((item) => item.status === "superseded")).toBe(true);
  });
});
