import { describe, expect, it } from "vitest";
import raw from "../../data/dataset.json";
import type { Dataset } from "./types";
import { collectPosters, queryPosters, wallPosters } from "./posters";
import { validateDataset } from "../schema/validate";

const dataset = validateDataset(structuredClone(raw)).value as Dataset;

describe("poster gallery records", () => {
  it("joins named blocked handles with imported profiles", () => {
    const posters = collectPosters(dataset);
    expect(posters.length).toBeGreaterThan(dataset.accounts.length);
    expect(posters.some((poster) => poster.handle === "GLaDOUGHSandHiv")).toBe(true);
    const namedBlocked = posters.find((poster) => poster.handle === "GLaDOUGHSandHiv");
    expect(namedBlocked?.blockState).toBe("blocked");
    expect(namedBlocked?.blockedOn).toBe("2026-11-01");
    const followed = posters.find((poster) => poster.handle.toLowerCase() === "mdp_sec");
    expect(followed?.blockState).toBe("blocked");
    expect(followed?.blockedOn).toBe("2026-11-07");
    expect(followed?.followers).toEqual(expect.any(Number));
  });

  it("can sort chartable posters by posts and keep pending last when sorting by block date", () => {
    const posters = collectPosters(dataset);
    const byPosts = queryPosters(posters, {
      text: "",
      onList: "any",
      block: "any",
      profile: "yes",
      sortKey: "lifetime_posts",
      sortDir: "desc",
    });
    expect(byPosts[0]?.lifetimePosts ?? 0).toBeGreaterThan(byPosts.at(-1)?.lifetimePosts ?? 0);
    const withUnblocked = [
      ...posters,
      {
        ...posters[0]!,
        id: "account:still_pending",
        handle: "still_pending",
        blockedOn: null,
        blockState: "not_blocked" as const,
      },
    ];
    const byDate = queryPosters(withUnblocked, {
      text: "",
      onList: "any",
      block: "any",
      profile: "any",
      sortKey: "blocked_on",
      sortDir: "asc",
    });
    expect(byDate[0]?.blockedOn).toBe("2026-11-01");
    expect(byDate.at(-1)?.blockedOn).toBeNull();
    expect(wallPosters(posters)[0]?.followers).toEqual(expect.any(Number));
  });
});
