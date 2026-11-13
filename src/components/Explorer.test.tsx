import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Poster } from "../lib/posters";
import { Explorer } from "./Explorer";
import { ReachChart, TopPosters } from "./PosterChart";

const posters: Poster[] = [
  {
    id: "account:alpha",
    handle: "alpha",
    displayName: "Alpha",
    lifetimePosts: 12,
    followers: 40,
    following: 2,
    createdOn: "2021-02-02",
    profileAsOf: "2026-11-06T09:00:00-05:00",
    blockedOn: "2026-11-06",
    blockState: "blocked",
    onList: "yes",
  },
  {
    id: "account:beta",
    handle: "beta",
    displayName: "Beta",
    lifetimePosts: 90,
    followers: 3,
    following: 4,
    createdOn: "2023-03-03",
    profileAsOf: "2026-11-06T09:00:00-05:00",
    blockedOn: null,
    blockState: "not_blocked",
    onList: "unknown",
  },
];

describe("explorer and poster chart", () => {
  it("filters imported accounts, shows avatars, and charts public counters", async () => {
    const user = userEvent.setup();
    const onSelect = () => {};
    render(
      <>
        <Explorer posters={posters} selected={null} onSelect={onSelect} />
        <ReachChart posters={posters} selected={null} onSelect={onSelect} />
        <TopPosters posters={posters} selected={null} onSelect={onSelect} />
      </>,
    );

    expect(screen.getAllByText(/not measured AI slop volume/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "@alpha" }).length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".avatar-wrap").length).toBeGreaterThan(0);
    await user.type(screen.getByRole("searchbox", { name: "Search handle" }), "beta");
    const table = within(screen.getByRole("table"));
    expect(table.queryByRole("link", { name: "@alpha" })).not.toBeInTheDocument();
    expect(table.getByRole("link", { name: "@beta" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Posts/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /@beta, 90 posts, 3 followers, open/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Top posters by followers" })).toHaveTextContent("@alpha");
    await user.click(
      within(screen.getByRole("group", { name: "Ranking metric" })).getByRole("button", { name: "Posts" }),
    );
    expect(screen.getByRole("list", { name: "Top posters by lifetime posts" }).textContent).toMatch(
      /@beta.*@alpha/,
    );
  });
});
