import { beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderApp } from "./test-utils";
import { useAppStore } from "@/store/useAppStore";
import { mockDriver } from "@/mocks/driver";
import { mockNotifications } from "@/mocks/notifications";
import { mockTrips } from "@/mocks/trips";
import { mockSettlements } from "@/mocks/settlements";
import { mockExpenses, mockFuelSubmissions } from "@/mocks/expenses";

beforeEach(() => {
  useAppStore.setState({
    driver: mockDriver,
    trips: mockTrips,
    notifications: mockNotifications,
    expenses: mockExpenses,
    fuelSubmissions: mockFuelSubmissions,
    incidents: [],
    settlements: mockSettlements,
    offlineQueue: [],
    networkStatus: "ONLINE",
    language: "en",
  });
});

describe("trip flow", () => {
  it("filters completed trips in my trips", async () => {
    const user = userEvent.setup();
    renderApp("/trips");

    expect(await screen.findByRole("heading", { name: /my trips/i })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /completed/i })[0]);
    expect(await screen.findByText("TRIP-1002")).toBeInTheDocument();
  });

  it("requires checklist completion before marking a dispatched trip ready for transit", async () => {
    const user = userEvent.setup();
    renderApp("/trips/TRIP-1003");

    expect(await screen.findByText(/pre-departure checklist/i)).toBeInTheDocument();
    const startButton = screen.getByRole("button", { name: /mark ready for transit/i });
    expect(startButton).toBeDisabled();

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);
    await user.type(screen.getByRole("textbox", { name: /odometer start reading/i }), "45220");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /mark ready for transit/i })).toBeEnabled();
    });
  });

  it("uses the selected trip for fuel and expense forms", async () => {
    const user = userEvent.setup();
    renderApp("/fuel-expenses");

    expect(await screen.findByRole("heading", { name: /fuel & expenses/i })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("TRIP-1001")[0]).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: /selected trip/i }), "TRIP-1003");

    expect(screen.getAllByDisplayValue("TRIP-1003")[0]).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /trip expenses/i }));
    expect(screen.getByDisplayValue("TRIP-1003")).toBeInTheDocument();
  });
});
