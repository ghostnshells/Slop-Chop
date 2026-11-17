import { describe, expect, it } from "vitest";
import raw from "../../data/dataset.json";
import current from "../../data/clankwall/current.json";
import history from "../../data/clankwall/history.json";
import {
  clankwallBlockCoverage,
  distributionBuckets,
  matchLabel,
  namedBlockedHandles,
  normalizeClankwall,
  recordMatch,
  summarize,
} from "./clankwall";
import type { Dataset } from "./types";
import { validateDataset } from "../schema/validate";

const dataset = validateDataset(structuredClone(raw)).value as Dataset;

describe("Clankwall snapshot", () => {
  const parsed = normalizeClankwall(current, current.imported_at);

  it("keeps the published Nov 8 totals and treats spam-only separately", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const summary = summarize(parsed.value.accounts);
    expect(summary.total).toBe(2769);
    expect(summary.aiFlagged).toBe(773);
    expect(summary.spamOnly).toBe(1996);
    expect(summary.aiAtLeast).toEqual({ two: 329, three: 234, five: 158 });
    expect(distributionBuckets(summary).find((bucket) => bucket.label === "1")?.accounts).toBe(444);
    expect(history.entries.map((entry) => entry.snapshot)).toContain(parsed.value.snapshot);
  });

  it("rejects a short file and does not call a missing handle unblocked", () => {
    const broken = normalizeClankwall(
      {
        source: "https://clankwall.vogel.dev",
        meta_all: {
          snapshot: "aaaaaaaaaaaaaaaa",
          generated_at: "2026-11-08T19:01:38.305Z",
          total: 2,
          flag_rule: "Flags are signals, not proof of AI use.",
        },
        accounts: [],
      },
      "2026-11-10T00:00:00Z",
    );
    expect(broken.ok).toBe(false);

    const blocked = namedBlockedHandles(dataset);
    expect(recordMatch("not_a_real_handle_zz", blocked)).toBe("not_in_named_records");
    expect(matchLabel("not_in_named_records")).not.toMatch(/unblocked/i);
    expect(matchLabel("in_our_records")).toBe("In our block records");
  });

  it("reads the latest Clankwall block coverage from the monitor snapshot", () => {
    const coverage = clankwallBlockCoverage(dataset);
    expect(coverage).toMatchObject({
      feedSize: 787,
      blocked: 772,
      notBlocked: 15,
    });
    expect(coverage?.asOf).toBe("2026-11-11T23:23:00-05:00");
    expect(coverage?.notes).toMatch(/suspended/i);
    expect(coverage?.notes).toMatch(/did not unblock/i);
    expect(coverage?.notes).toMatch(/mariaai_786/);
  });
});
