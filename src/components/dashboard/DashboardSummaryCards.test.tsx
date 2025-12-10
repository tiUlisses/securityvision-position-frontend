// src/components/dashboard/DashboardSummaryCards.test.tsx
import { render, screen } from "@testing-library/react";
import { DashboardSummaryCards } from "./DashboardSummaryCards";
import type { DashboardSummary } from "../../api/types";

const mockSummary: DashboardSummary = {
  total_people: 10,
  total_tags: 15,
  total_gateways: 3,
  gateways_online: 2,
  gateways_offline: 1,
  active_alert_rules: 2,
  recent_alerts_24h: 5,
};

describe("DashboardSummaryCards", () => {
  it("renderiza os cards com os valores corretos", () => {
    render(<DashboardSummaryCards summary={mockSummary} />);

    const container = screen.getByTestId("dashboard-summary-cards");
    expect(container).toBeInTheDocument();

    expect(screen.getByText("Pessoas rastreadas")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    expect(screen.getByText("Tags ativas")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();

    expect(screen.getByText("Gateways")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    // gateways online 2, offline 1
    expect(screen.getByText("Gateways online")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1 offline")).toBeInTheDocument();

    expect(
      screen.getByText("Regras de alerta ativas")
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(
      screen.getByText("Alertas nas últimas 24h")
    ).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
