import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("monitor page", () => {
  it("shows the completed Nov 6 total without counting the superseded 110", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/AI slop posters/i);
    expect(screen.getByRole("article", { name: "Monitor newly blocked, complete days" })).toHaveTextContent(
      "797",
    );
    expect(screen.getByRole("article", { name: "Partial monitor blocks" })).toHaveTextContent("0");
    expect(screen.getByRole("article", { name: "X blocks at latest timestamp" })).toHaveTextContent("798");
    expect(screen.getByRole("article", { name: "Curated list size at a timestamp" })).toHaveTextContent(
      "794",
    );
    expect(screen.getByRole("complementary", { name: "Unfinished batch" })).toHaveTextContent("37");
    expect(screen.getByRole("complementary", { name: "Unfinished batch" })).toHaveTextContent("mdp_sec");
    const snapshots = screen.getByRole("region", { name: "Snapshots and pending work" });
    expect(snapshots).toHaveTextContent("Nov 6, 2026, 9:00 AM EST");
    expect(snapshots).toHaveTextContent("Nov 6, 2026, 11:35 AM EST");
    expect(snapshots).toHaveTextContent("Nov 6, 2026, 11:37 PM EST");
    expect(document.querySelector(".stamp")).toBeNull();

    expect(screen.getByRole("button", { name: /November 6, 2026, 347 newly blocked/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("region", { name: "November 6, 2026 detail" })).toHaveTextContent("347");
    expect(screen.getByText(/left out of the totals/)).toHaveTextContent("110");

    await user.click(screen.getByRole("button", { name: /November 5, 2026, 378 newly blocked/ }));
    expect(screen.getByRole("region", { name: "November 5, 2026 detail" })).toHaveTextContent("378");
    expect(screen.getByText(/approval t3s15/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cumulative" }));
    expect(
      screen.getByRole("button", { name: /November 5, 2026, 450 cumulative newly blocked/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Daily timeline" })).toHaveTextContent(
      /Cumulative including partial records:\s*797/,
    );

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText(/Showing/)).toHaveTextContent("3 of 6 days");

    const method = screen.getByRole("region", { name: "Methodology" });
    expect(method).toHaveTextContent(/community assessment/);
    expect(method).toHaveTextContent(/not measured AI slop volume/);
    expect(method).toHaveTextContent(/Superseded rows/);
    const explorer = screen.getByRole("region", { name: "Account explorer" });
    expect(explorer).toHaveTextContent(/not measured AI slop volume/);
    expect(explorer).toHaveTextContent("@mdp_sec");
    expect(explorer).not.toHaveTextContent(/No public profiles in this dataset/);
    expect(document.body.textContent ?? "").not.toMatch(/\babusers?\b/i);
  });

  it("renders a validation failure instead of invented numbers", () => {
    render(<App raw={{ schema_version: "nope" }} />);
    expect(screen.getByRole("heading", { name: /failed validation/i })).toBeInTheDocument();
  });
});
