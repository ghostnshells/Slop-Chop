import { describe, expect, it } from "vitest";
import raw from "../../data/dataset.json";
import example from "../../data/examples/nightly-export.example.json";
import type { Dataset } from "../lib/types";
import { validateDataset, validateInbox } from "./validate";

function dataset(): Dataset {
  return structuredClone(raw) as Dataset;
}

describe("dataset contract", () => {
  it("accepts the seeded dataset and the example export", () => {
    const seeded = validateDataset(raw);
    expect(seeded.ok, seeded.errors.map((error) => `${error.path} ${error.message}`).join("\n")).toBe(true);
    expect(seeded.value?.accounts).toHaveLength(37);
    expect(seeded.value?.events.find((event) => event.id === "monitor-new:2026-11-06:11:35")?.status).toBe(
      "superseded",
    );
    const inbox = validateInbox(example);
    expect(inbox.ok, inbox.errors.map((error) => error.message).join("\n")).toBe(true);
  });

  it("rejects duplicate ids, broken handle lists, and snapshot math", () => {
    const duplicate = dataset();
    duplicate.events.push({ ...duplicate.events[0]! });
    expect(validateDataset(duplicate).ok).toBe(false);

    const handles = dataset();
    handles.events[1]!.handles = [];
    handles.events[1]!.handles_complete = true;
    expect(validateDataset(handles).errors.some((error) => error.message.includes("handles_complete"))).toBe(
      true,
    );

    const snapshot = dataset();
    snapshot.snapshots[1]!.list_members_blocked = 1;
    expect(validateDataset(snapshot).errors.some((error) => error.message.includes("list_size"))).toBe(true);
  });

  it("rejects an open-work record that would not match its event", () => {
    const next = dataset();
    next.open_work[0]!.remaining = 1;
    const result = validateDataset(next);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.message.includes("approved_count"))).toBe(true);
  });

  it("allows an unblocked gap when it does not exceed list size", () => {
    const next = dataset();
    const event = next.events[0]!;
    event.new_blocks = 30;
    event.handles_complete = false;
    expect(validateDataset(next).ok).toBe(true);
    event.new_blocks = 80;
    expect(validateDataset(next).errors.some((error) => error.message.includes("cannot exceed"))).toBe(
      true,
    );
  });

  it("rejects a negative count at the schema layer", () => {
    const next = dataset();
    next.events[0]!.new_blocks = -5;
    expect(validateDataset(next).ok).toBe(false);
  });
});
