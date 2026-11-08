import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("poster gallery", () => {
  it("leads with posters and the Nov 7 monitor total without mixing in the X block list", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/AI slop posters/i);
    expect(screen.getByRole("article", { name: "Monitor newly blocked, complete days" })).toHaveTextContent(
      "861",
    );
    expect(screen.getByRole("article", { name: "Partial monitor blocks" })).toHaveTextContent("0");
    expect(screen.getByRole("article", { name: "X blocks at latest timestamp" })).toHaveTextContent("859");
    expect(screen.getByRole("article", { name: "Curated list size at a timestamp" })).toHaveTextContent(
      "811",
    );
    expect(screen.queryByRole("complementary", { name: "Unfinished batch" })).not.toBeInTheDocument();
    const snapshots = screen.getByRole("region", { name: "Snapshots and pending work" });
    expect(snapshots).toHaveTextContent("Nov 7, 2026, 11:33 PM EST");
    expect(snapshots).toHaveTextContent("859");
    expect(snapshots).toHaveTextContent("not observed");
    expect(document.querySelector(".stamp")).toBeNull();

    expect(
      screen.getByRole("list", { name: "Named slop posters" }).querySelectorAll(".avatar-wrap").length,
    ).toBeGreaterThan(20);
    expect(screen.getByRole("link", { name: "@mdp_sec" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /November 7, 2026, 64 newly blocked/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("region", { name: "November 7, 2026 detail" })).toHaveTextContent("64");
    expect(screen.getByRole("button", { name: /November 6, 2026, 347 newly blocked/ })).toBeInTheDocument();
    expect(screen.getByText(/Superseded record/)).toHaveTextContent("110");

    await user.click(screen.getByRole("button", { name: /November 5, 2026, 378 newly blocked/ }));
    expect(screen.getByRole("region", { name: "November 5, 2026 detail" })).toHaveTextContent("378");
    expect(screen.getByText(/approval t3s15/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cumulative" }));
    expect(
      screen.getByRole("button", { name: /November 5, 2026, 450 cumulative newly blocked/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "When" })).toHaveTextContent("861");

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText(/Showing/)).toHaveTextContent("4 of 7 days");

    const method = screen.getByRole("region", { name: "Methodology" });
    expect(method).toHaveTextContent(/community assessment/);
    expect(method).toHaveTextContent(/not measured AI slop volume/);
    expect(method).toHaveTextContent(/Superseded rows/);
    const explorer = screen.getByRole("region", { name: "Account explorer" });
    expect(explorer).toHaveTextContent(/not measured AI slop volume/);
    expect(explorer).toHaveTextContent("@mdp_sec");
    expect(explorer).not.toHaveTextContent(/No public profiles in this dataset/);
    expect(screen.getByRole("region", { name: "Top posters" })).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/\babusers?\b/i);
    expect(document.body.textContent ?? "").not.toMatch(/Umar/);
  });

  it("renders a validation failure instead of invented numbers", () => {
    render(<App raw={{ schema_version: "nope" }} />);
    expect(screen.getByRole("heading", { name: /failed validation/i })).toBeInTheDocument();
  });
});
