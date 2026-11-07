import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("monitor page", () => {
  it("shows verified totals, partial Nov 6, and separate snapshot timestamps", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/AI slop posters/i);
    expect(screen.getByRole("article", { name: "Monitor newly blocked, complete days" })).toHaveTextContent(
      "450",
    );
    expect(screen.getByRole("article", { name: "Partial monitor blocks" })).toHaveTextContent("110");
    expect(screen.getByRole("article", { name: "X blocks at latest timestamp" })).toHaveTextContent("562");
    expect(screen.getByRole("article", { name: "Curated list size at a timestamp" })).toHaveTextContent(
      "775",
    );
    expect(screen.getByRole("complementary", { name: "Unfinished batch" })).toHaveTextContent("237");
    const snapshots = screen.getByRole("region", { name: "Snapshots and pending work" });
    expect(snapshots).toHaveTextContent("Nov 6, 2026, 9:00 AM EST");
    expect(snapshots).toHaveTextContent("Nov 6, 2026, 11:35 AM EST");
    expect(snapshots).toHaveTextContent("Nov 5, 2026, 11:35 PM EST");
    expect(screen.getByRole("article", { name: "Curated list size at a timestamp" })).toHaveTextContent(
      "428",
    );

    await user.click(screen.getByRole("button", { name: /November 5, 2026, 378 newly blocked/ }));
    const detail = screen.getByRole("region", { name: "November 5, 2026 detail" });
    expect(detail).toHaveTextContent("378");
    expect(screen.getByText(/approval t3s15/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cumulative" }));
    expect(
      screen.getByRole("button", { name: /November 5, 2026, 450 cumulative newly blocked/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Daily timeline" })).toHaveTextContent(
      /Cumulative including partial records:\s*560/,
    );

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText(/Showing/)).toHaveTextContent("3 of 6 days");

    const method = screen.getByRole("region", { name: "Methodology" });
    expect(method).toHaveTextContent(/community assessment/);
    expect(method).toHaveTextContent(/not measured AI slop volume/);
    expect(screen.getByRole("region", { name: "Account explorer" })).toHaveTextContent(
      /No public profiles in this dataset/,
    );
    expect(document.body.textContent ?? "").not.toMatch(/\babusers?\b/i);
  });

  it("renders a validation failure instead of invented numbers", () => {
    render(<App raw={{ schema_version: "nope" }} />);
    expect(screen.getByRole("heading", { name: /failed validation/i })).toBeInTheDocument();
  });
});
