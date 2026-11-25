import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("poster gallery", () => {
  it("keeps the redesign and shows Nov 10–11 as partial with the suspension note", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/AI slop posters blocked/i);
    expect(screen.getByRole("article", { name: "Monitor newly blocked, complete days" })).toHaveTextContent(
      "939",
    );
    expect(screen.getByRole("article", { name: "X blocks at latest timestamp" })).toHaveTextContent("943");
    expect(screen.getByRole("article", { name: "X blocks at latest timestamp" })).toHaveTextContent(
      "Nov 14, 2026, 3:01 AM EST",
    );
    expect(screen.getByRole("article", { name: "X blocks at latest timestamp" })).toHaveTextContent(
      "Suspended accounts that leave this list are not unblocks.",
    );
    expect(screen.getByRole("article", { name: "Curated list size at a timestamp" })).toHaveTextContent(
      "787",
    );
    expect(screen.queryByText(/Snapshots and pending work/)).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Unfinished batch" })).not.toBeInTheDocument();
    expect(screen.getByText(/Nov 8 partial \+11/)).toBeInTheDocument();

    expect(
      screen.getByRole("list", { name: "Named slop posters" }).querySelectorAll(".avatar-wrap").length,
    ).toBeGreaterThan(20);
    expect(screen.getByRole("link", { name: /more$/ })).toHaveAttribute("href", "#explorer");
    expect(screen.getByRole("link", { name: "@mdp_sec" })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /November 25, 2026, 0 newly blocked, partial incomplete day/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "November 24, 2026, 0 newly blocked" })).toBeInTheDocument();
    const readout = document.querySelector(".readout");
    expect(readout).toHaveTextContent("Nov 25");
    expect(readout).toHaveTextContent("0 new · 950 total");
    expect(readout).toHaveTextContent("partial");
    expect(
      screen.getByRole("button", { name: /November 12, 2026, 0 newly blocked, partial incomplete day/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /November 14, 2026, 0 newly blocked, partial incomplete day/ }),
    ).toBeInTheDocument();

    for (let step = 0; step < 7; step += 1) {
      await user.click(screen.getByRole("button", { name: "Pan earlier" }));
    }
    await user.click(screen.getByRole("button", { name: /November 5, 2026, 378 newly blocked/ }));
    expect(screen.getByText(/378 new · 450 total/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cumulative" }));
    expect(
      screen.getByRole("button", { name: /November 5, 2026, 450 cumulative newly blocked/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Blocks per day" })).toHaveTextContent("950");

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText(/7 of 25 days/)).toBeInTheDocument();
    const clankwall = screen.getByRole("region", { name: "Clankwall" });
    expect(clankwall).toHaveTextContent("2,769");
    expect(clankwall).toHaveTextContent("772/787");
    expect(clankwall).toHaveTextContent(/signals, not proof/i);
    expect(clankwall).toHaveTextContent(/not extrapolated/i);
    expect(clankwall).toHaveTextContent("Nov 14, 2026, 3:01 AM EST");

    const method = screen.getByRole("region", { name: "Methodology" });
    expect(method).toHaveTextContent(/community assessment/);
    expect(method).toHaveTextContent(/not measured AI slop volume/);
    expect(method).toHaveTextContent(/Superseded rows/);
    expect(method).toHaveTextContent("110");
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
