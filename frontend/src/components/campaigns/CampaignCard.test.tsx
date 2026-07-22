import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { CampaignCard } from "@/components/campaigns/CampaignCard";
import type { CampaignListItem } from "@/lib/types";

const campaign: CampaignListItem = {
  id: 1,
  slug: "atelier-couture",
  title: "Atelier de couture",
  summary: "Former dix jeunes femmes à la couture.",
  location: "Dakar",
  category: "ARTISANAT",
  category_display: "Artisanat",
  goal_amount: 800000,
  collected_amount: 320000,
  cover_image: null,
  deadline: "2026-09-01",
  status: "PUBLIEE",
  status_display: "Publiée",
  moderation_note: "",
  suspension_note: "",
  progress_percent: 40,
  days_left: 20,
};

describe("CampaignCard", () => {
  it("présente les informations essentielles et une progression accessible", () => {
    render(
      <MemoryRouter>
        <CampaignCard campaign={campaign} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Atelier de couture/i }),
    ).toHaveAttribute("href", "/campagnes/atelier-couture");
    expect(screen.getByText("Dakar")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
