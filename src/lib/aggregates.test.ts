import { describe, expect, it } from "vitest";
import raw from "../../data/dataset.json";
import { aggregate } from "./aggregates";
import { formatAsOf } from "./format";
import type { Dataset } from "./types";
import { validateDataset } from "../schema/validate";

const dataset = validateDataset(structuredClone(raw)).value as Dataset;

describe("verified monitor totals", () => {
  const totals = aggregate(dataset);

  it("keeps Nov 1–5 at 450, Nov 6 at 347, and Nov 7 at 64", () => {
    expect(totals.days.map((day) => [day.date, day.newBlocks, day.status])).toEqual([
      ["2026-11-01", 41, "complete"],
      ["2026-11-02", 17, "complete"],
      ["2026-11-03", 13, "complete"],
      ["2026-11-04", 1, "complete"],
      ["2026-11-05", 378, "complete"],
      ["2026-11-06", 347, "complete"],
      ["2026-11-07", 64, "complete"],
    ]);
    expect(totals.completeNewBlocks).toBe(861);
    expect(totals.partialNewBlocks).toBe(0);
    expect(totals.recordedNewBlocks).toBe(861);
    expect(totals.lastCompleteDate).toBe("2026-11-07");
    expect(totals.days[4]?.cumulativeComplete).toBe(450);
    expect(totals.days[5]?.cumulativeRecorded).toBe(797);
    expect(totals.days[5]?.cumulativeComplete).toBe(797);
    expect(totals.days[6]?.cumulativeRecorded).toBe(861);
    const superseded = dataset.events.find((event) => event.id === "monitor-new:2026-11-06:11:35");
    expect(superseded?.status).toBe("superseded");
    expect(superseded?.new_blocks).toBe(110);
  });

  it("does not fold snapshots, unfinished batch size, or preexisting blocks into the monitor sum", () => {
    const mutated = structuredClone(dataset);
    mutated.snapshots[0]!.x_blocks_total = 99999;
    mutated.open_work[0]!.approved_count = 99999;
    mutated.open_work[0]!.remaining = 99999;
    mutated.monitoring.preexisting_blocked_excluded = 70;
    const next = aggregate(mutated);
    expect(next.recordedNewBlocks).toBe(861);
    expect(next.completeNewBlocks).toBe(861);
    expect(next.preexistingBlockedExcluded).toBe(70);
  });

  it("leaves superseded events out of the daily sum", () => {
    const mutated = structuredClone(dataset);
    mutated.events.push({
      ...mutated.events[0]!,
      id: "monitor-new:2026-11-01:09:00:old",
      status: "superseded",
      new_blocks: 100,
      notes: "Superseded copy kept only for the audit trail.",
    });
    expect(aggregate(mutated).days[0]?.newBlocks).toBe(41);
  });

  it("formats the Nov 6 partial timestamp in Eastern time", () => {
    expect(formatAsOf("2026-11-06T11:35:00-05:00")).toMatch(/Nov 6, 2026.*11:35 AM EST/);
    expect(formatAsOf("2026-11-06T09:00:00-05:00")).toMatch(/9:00 AM EST/);
    expect(formatAsOf("2026-11-05T23:35:00-05:00")).toMatch(/Nov 5, 2026.*11:35 PM EST/);
  });
});
