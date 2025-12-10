// src/components/layout/Sidebar.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("renderiza os links básicos", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Prédios")).toBeInTheDocument();
    expect(screen.getByText("Pessoas")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("Alertas")).toBeInTheDocument();
    expect(screen.getByText("Rastreamento")).toBeInTheDocument();
  });
});
