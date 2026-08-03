import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventDetails from "@/pages/EventDetails";
import type { Event, TicketType } from "@/types/api";

const { getEvent, getTicketTypes, getEventSeats } = vi.hoisted(() => ({
  getEvent: vi.fn(),
  getTicketTypes: vi.fn(),
  getEventSeats: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiService: {
    getEvent,
    getTicketTypes,
    getEventSeats,
    getEvents: vi.fn().mockResolvedValue([]),
    getFollowing: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addItem: vi.fn().mockResolvedValue(true) }),
}));

vi.mock("@/contexts/PreferencesContext", () => ({
  usePreferences: () => ({ addRecentlyViewed: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/components/SeatingMap", () => ({
  SeatingMap: () => <div>Seat map</div>,
  generateSampleSeats: () => [],
}));

vi.mock("@/components/ShareActions", () => ({
  ShareActionsContainer: () => <div>Share event</div>,
}));

vi.mock("@/components/LiveAttendanceBadge", () => ({
  LiveAttendanceBadge: () => <div>Live attendance</div>,
  useSimulatedViewers: () => 12,
}));

vi.mock("@/components/EventCard", () => ({
  EventCard: () => <div>Related event</div>,
}));

const event: Event = {
  id: "event-1",
  name: "Summer Test Event",
  description: "A test event",
  startTime: "2030-08-03T18:00:00Z",
  endTime: "2030-08-03T20:00:00Z",
  status: "PUBLISHED",
  venue: "Test Hall",
};

const ticket: TicketType = {
  id: "ticket-1",
  eventId: event.id,
  name: "GENERAL_ADMISSION",
  price: 25,
  totalQuantity: 20,
  availableQuantity: 20,
  reservedQuantity: 0,
  soldQuantity: 0,
  status: "ACTIVE",
};

function renderEventDetails(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/events/${event.id}`]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("EventDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEvent.mockResolvedValue(event);
    getTicketTypes.mockResolvedValue([ticket]);
    getEventSeats.mockResolvedValue([]);
  });

  it("renders safely before inventory has resolved and then shows tickets", async () => {
    let resolveInventory: (tickets: TicketType[]) => void = () => undefined;
    getTicketTypes.mockReturnValue(new Promise((resolve) => { resolveInventory = resolve; }));

    renderEventDetails();

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    await act(async () => resolveInventory([ticket]));

    expect(await screen.findByText("Summer Test Event")).toBeInTheDocument();
    expect(await screen.findByText("$25.00")).toBeInTheDocument();
  });

  it("offers a retry when ticket inventory cannot be loaded", async () => {
    getTicketTypes.mockRejectedValueOnce(new Error("inventory offline"));

    renderEventDetails();

    expect(await screen.findByText("Ticket availability is temporarily unavailable")).toBeInTheDocument();
    getTicketTypes.mockResolvedValueOnce([ticket]);
    fireEvent.click(screen.getByRole("button", { name: "Retry ticket availability" }));

    expect(await screen.findByText("$25.00")).toBeInTheDocument();
  });

  it("distinguishes a temporary API outage from a missing event", async () => {
    getEvent.mockRejectedValueOnce({ isAxiosError: true, message: "Network Error" });

    renderEventDetails();

    expect(await screen.findByText("Event temporarily unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();

    getEvent.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    await waitFor(() => expect(screen.getByText("Event not found")).toBeInTheDocument());
  });
});
