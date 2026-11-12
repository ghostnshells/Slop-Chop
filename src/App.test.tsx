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
      "939",
    );
    expect(screen.getByRole("article", { name: "Partial monitor blocks" })).toHaveTextContent("11");
    expect(screen.getByRole("article", { name: "Partial monitor blocks" })).toHaveTextContent(
      "Recorded floor, not a full count",
    );
    expect(screen.getByRole("article", { name: "X blocks at latest timestamp" })).toHaveTextContent("943");
    expect(screen.getByRole("article", { name: "X blocks at latest timestamp" })).toHaveTextContent(
      "not unblocks",
    );
    expect(screen.getByRole("article", { name: "Curated list size at a timestamp" })).toHaveTextContent(
      "787",
    );
    expect(screen.queryByRole("complementary", { name: "Unfinished batch" })).not.toBeInTheDocument();
    const snapshots = screen.getByRole("region", { name: "Snapshots and pending work" });
    expect(snapshots).toHaveTextContent("Nov 7, 2026, 11:33 PM EST");
    expect(snapshots).toHaveTextContent("859");
    expect(snapshots).toHaveTextContent("not observed");
    expect(snapshots).toHaveTextContent("did not unblock");
    expect(snapshots).toHaveTextContent("@veefightclip");
    expect(snapshots).toHaveTextContent("@jimmyaicreator");
    expect(snapshots).toHaveTextContent("@mariaai_786");
    expect(document.querySelector(".stamp")).toHaveTextContent(/Nov 11/);
    expect(screen.getByRole("article", { name: "Partial monitor blocks" })).toHaveTextContent("Nov 11 0");
    expect(screen.getByRole("button", { name: /November 8, 2026, 11 newly blocked, partial floor/ })).toBeInTheDocument();

    expect(
      screen.getByRole("list", { name: "Named slop posters" }).querySelectorAll(".avatar-wrap").length,
    ).toBeGreaterThan(20);
    expect(screen.getByRole("link", { name: "@mdp_sec" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /November 11, 2026, 0 newly blocked, partial floor/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("region", { name: "November 11, 2026 detail" })).toHaveTextContent(
      "partial floor, not a full day",
    );
    expect(screen.getByRole("button", { name: /November 9, 2026, 78 newly blocked/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /November 7, 2026, 64 newly blocked/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /November 6, 2026, 347 newly blocked/ })).toBeInTheDocument();
    expect(screen.getByText(/Superseded record/)).toHaveTextContent("110");

    await user.click(screen.getByRole("button", { name: /November 5, 2026, 378 newly blocked/ }));
    expect(screen.getByRole("region", { name: "November 5, 2026 detail" })).toHaveTextContent("378");
    expect(screen.getByText(/approval t3s15/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cumulative" }));
    expect(
      screen.getByRole("button", { name: /November 5, 2026, 450 cumulative newly blocked/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "When" })).toHaveTextContent("950");

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText(/6 of 11 days/)).toBeInTheDocument();
    const clankwall = screen.getByRole("region", { name: "Clankwall" });
    expect(clankwall).toHaveTextContent("2,769");
    expect(clankwall).toHaveTextContent("772/787");
    expect(clankwall).toHaveTextContent(/signals, not proof/i);
    expect(clankwall).toHaveTextContent(/did not unblock/i);
    expect(clankwall).toHaveTextContent("@mariaai_786");

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
