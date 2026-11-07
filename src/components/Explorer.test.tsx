import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Account } from "../lib/types";
import { Explorer } from "./Explorer";
import { Rankings } from "./Rankings";

const accounts: Account[] = [
  {
    id: "account:alpha",
    handle: "alpha",
    profile: {
      as_of: "2026-11-06T09:00:00-05:00",
      source: "public-profile",
      provenance: "Fixture profile. Lifetime posts are not AI slop volume.",
      lifetime_posts: 12,
      followers: 40,
      following: 2,
      created_on: "2021-02-02",
    },
    list_membership: {
      as_of: "2026-11-06T09:00:00-05:00",
      source: "list-snapshot",
      provenance: "Fixture membership is a community assessment.",
      on_list: true,
    },
    block: {
      as_of: "2026-11-06T09:00:00-05:00",
      source: "monitor-event",
      provenance: "Fixture block state.",
      state: "blocked",
    },
  },
  {
    id: "account:beta",
    handle: "beta",
    profile: {
      as_of: "2026-11-06T09:00:00-05:00",
      source: "public-profile",
      provenance: "Fixture profile with fewer followers.",
      lifetime_posts: 90,
      followers: 3,
      following: 4,
      created_on: "2023-03-03",
    },
  },
];

describe("explorer and rankings", () => {
  it("filters imported accounts and labels lifetime posts as a public counter", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Explorer accounts={accounts} />
        <Rankings accounts={accounts} />
      </>,
    );

    expect(screen.getAllByText(/not measured AI slop volume/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "@alpha" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Search handle" }), "beta");
    expect(screen.queryByRole("link", { name: "@alpha" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@beta" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Lifetime posts \(public profile\)/ })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /Public lifetime posts ranking/ })).toHaveTextContent("@beta");
  });
});
