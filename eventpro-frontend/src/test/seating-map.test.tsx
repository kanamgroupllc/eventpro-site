import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeatingMap, generateSampleSeats, Seat } from "@/components/SeatingMap";
import { TooltipProvider } from "@/components/ui/tooltip";

// Helper to wrap component with required providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(<TooltipProvider>{component}</TooltipProvider>);
};

describe("SeatingMap", () => {
  const mockOnSeatSelect = vi.fn();
  
  // Create predictable test seats
  const createTestSeats = (): Seat[] => [
    { id: "Orchestra-A-1", row: "A", number: 1, section: "Orchestra", price: 150, status: "available", type: "vip" },
    { id: "Orchestra-A-2", row: "A", number: 2, section: "Orchestra", price: 150, status: "available", type: "vip" },
    { id: "Orchestra-A-3", row: "A", number: 3, section: "Orchestra", price: 150, status: "sold", type: "vip" },
    { id: "Orchestra-B-1", row: "B", number: 1, section: "Orchestra", price: 100, status: "available", type: "premium" },
    { id: "Orchestra-B-2", row: "B", number: 2, section: "Orchestra", price: 100, status: "reserved", type: "premium" },
    { id: "Mezzanine-A-1", row: "A", number: 1, section: "Mezzanine", price: 75, status: "available", type: "standard" },
  ];

  beforeEach(() => {
    mockOnSeatSelect.mockClear();
  });

  it("renders the seating map with stage and sections", () => {
    const testSeats = createTestSeats();
    renderWithProviders(
      <SeatingMap seats={testSeats} onSeatSelect={mockOnSeatSelect} />
    );

    expect(screen.getByText("STAGE")).toBeInTheDocument();
    expect(screen.getByText("Select Your Seats")).toBeInTheDocument();
    expect(screen.getByText("Orchestra")).toBeInTheDocument();
    expect(screen.getByText("Mezzanine")).toBeInTheDocument();
  });

  it("renders the legend with all seat types", () => {
    const testSeats = createTestSeats();
    renderWithProviders(
      <SeatingMap seats={testSeats} onSeatSelect={mockOnSeatSelect} />
    );

    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Accessible")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByText("Sold")).toBeInTheDocument();
  });

  it("allows selecting available seats", () => {
    const testSeats = createTestSeats();
    renderWithProviders(
      <SeatingMap seats={testSeats} onSeatSelect={mockOnSeatSelect} />
    );

    // Find and click an available seat (seat number 1 in Orchestra)
    const seatButtons = screen.getAllByRole("button").filter(
      btn => btn.textContent === "1"
    );
    fireEvent.click(seatButtons[0]);

    expect(mockOnSeatSelect).toHaveBeenCalled();
    const selectedSeats = mockOnSeatSelect.mock.calls[0][0];
    expect(selectedSeats.length).toBe(1);
    expect(selectedSeats[0].status).toBe("selected");
  });

  it("prevents selecting sold seats", () => {
    const testSeats = createTestSeats();
    renderWithProviders(
      <SeatingMap seats={testSeats} onSeatSelect={mockOnSeatSelect} />
    );

    // Find the sold seat (seat 3 in Orchestra row A)
    const seatButtons = screen.getAllByRole("button").filter(
      btn => btn.textContent === "3"
    );
    // Sold seats should be disabled
    expect(seatButtons[0]).toBeDisabled();
  });

  it("respects maxSeats limit", () => {
    const testSeats = createTestSeats();
    renderWithProviders(
      <SeatingMap 
        seats={testSeats} 
        onSeatSelect={mockOnSeatSelect} 
        maxSeats={2} 
      />
    );

    // Click first available seat
    const seatButtons = screen.getAllByRole("button").filter(
      btn => btn.textContent === "1"
    );
    fireEvent.click(seatButtons[0]); // Select first seat
    
    // Click second available seat
    const seat2Buttons = screen.getAllByRole("button").filter(
      btn => btn.textContent === "2"
    );
    fireEvent.click(seat2Buttons[0]); // Select second seat

    // At this point we should have 2 seats selected
    expect(mockOnSeatSelect).toHaveBeenCalledTimes(2);
    const lastCall = mockOnSeatSelect.mock.calls[1][0];
    expect(lastCall.length).toBe(2);
  });

  it("calculates total price correctly", () => {
    const testSeats = createTestSeats();
    renderWithProviders(
      <SeatingMap seats={testSeats} onSeatSelect={mockOnSeatSelect} />
    );

    // Select first seat ($150 VIP)
    const seatButtons = screen.getAllByRole("button").filter(
      btn => btn.textContent === "1"
    );
    fireEvent.click(seatButtons[0]);

    // Should show total price
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("allows deselecting seats", () => {
    const testSeats = createTestSeats();
    renderWithProviders(
      <SeatingMap seats={testSeats} onSeatSelect={mockOnSeatSelect} />
    );

    const seatButtons = screen.getAllByRole("button").filter(
      btn => btn.textContent === "1"
    );
    
    // Select then deselect
    fireEvent.click(seatButtons[0]);
    fireEvent.click(seatButtons[0]);

    const lastCall = mockOnSeatSelect.mock.calls[1][0];
    expect(lastCall.length).toBe(0);
  });

  it("shows zoom controls", () => {
    const testSeats = createTestSeats();
    renderWithProviders(
      <SeatingMap seats={testSeats} onSeatSelect={mockOnSeatSelect} />
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("generateSampleSeats creates a valid seat array", () => {
    const seats = generateSampleSeats();
    
    expect(seats.length).toBeGreaterThan(0);
    
    // Check seat structure
    const firstSeat = seats[0];
    expect(firstSeat).toHaveProperty("id");
    expect(firstSeat).toHaveProperty("row");
    expect(firstSeat).toHaveProperty("number");
    expect(firstSeat).toHaveProperty("section");
    expect(firstSeat).toHaveProperty("price");
    expect(firstSeat).toHaveProperty("status");
    expect(firstSeat).toHaveProperty("type");
    
    // Check sections exist
    const sections = [...new Set(seats.map(s => s.section))];
    expect(sections).toContain("Orchestra");
    expect(sections).toContain("Mezzanine");
    expect(sections).toContain("Balcony");
  });
});
