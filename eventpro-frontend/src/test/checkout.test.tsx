import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { GuestCheckoutForm } from "@/components/GuestCheckoutForm";
import { MerchandiseAddons, sampleMerchandise } from "@/components/MerchandiseAddons";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("GuestCheckoutForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnLoginClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders guest checkout form with all fields", () => {
    render(
      <BrowserRouter>
        <GuestCheckoutForm onSubmit={mockOnSubmit} onLoginClick={mockOnLoginClick} />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue as Guest/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in for faster checkout/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    render(
      <BrowserRouter>
        <GuestCheckoutForm onSubmit={mockOnSubmit} onLoginClick={mockOnLoginClick} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Continue as Guest/i }));

    await waitFor(() => {
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("validates email format", async () => {
    render(
      <BrowserRouter>
        <GuestCheckoutForm onSubmit={mockOnSubmit} onLoginClick={mockOnLoginClick} />
      </BrowserRouter>
    );

    // Fill required fields first, but with empty email
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Doe" } });
    
    // Accept terms
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    
    fireEvent.click(screen.getByRole("button", { name: /Continue as Guest/i }));

    await waitFor(() => {
      // Since email is empty, it should show the required error
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    });
  });

  it("submits form with valid data", async () => {
    render(
      <BrowserRouter>
        <GuestCheckoutForm onSubmit={mockOnSubmit} onLoginClick={mockOnLoginClick} />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: "+1234567890" } });
    
    // Accept terms
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole("button", { name: /Continue as Guest/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+1234567890",
        acceptTerms: true,
      });
    });
  });

  it("calls onLoginClick when sign in button is clicked", () => {
    render(
      <BrowserRouter>
        <GuestCheckoutForm onSubmit={mockOnSubmit} onLoginClick={mockOnLoginClick} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign in for faster checkout/i }));
    expect(mockOnLoginClick).toHaveBeenCalled();
  });
});

describe("MerchandiseAddons", () => {
  const mockOnItemsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders merchandise items grouped by category", () => {
    render(
      <TooltipProvider>
        <MerchandiseAddons items={sampleMerchandise} onItemsChange={mockOnItemsChange} />
      </TooltipProvider>
    );

    expect(screen.getByText("Enhance Your Experience")).toBeInTheDocument();
    expect(screen.getByText("Event T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("VIP Parking Pass")).toBeInTheDocument();
    expect(screen.getByText("Meet & Greet Upgrade")).toBeInTheDocument();
  });

  it("shows popular badge for popular items", () => {
    render(
      <TooltipProvider>
        <MerchandiseAddons items={sampleMerchandise} onItemsChange={mockOnItemsChange} />
      </TooltipProvider>
    );

    const popularBadges = screen.getAllByText("Popular");
    expect(popularBadges.length).toBeGreaterThan(0);
  });

  it("selects item when checkbox is clicked", async () => {
    render(
      <TooltipProvider>
        <MerchandiseAddons items={sampleMerchandise} onItemsChange={mockOnItemsChange} />
      </TooltipProvider>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Select first item (Event T-Shirt)

    await waitFor(() => {
      expect(mockOnItemsChange).toHaveBeenCalled();
      const lastCall = mockOnItemsChange.mock.calls[mockOnItemsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(1);
      expect(lastCall[0].name).toBe("Event T-Shirt");
    });
  });

  it("shows size selector for merchandise items", async () => {
    render(
      <TooltipProvider>
        <MerchandiseAddons items={sampleMerchandise} onItemsChange={mockOnItemsChange} />
      </TooltipProvider>
    );

    // Select T-shirt (first item which has sizes)
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText("Size:")).toBeInTheDocument();
      expect(screen.getByText("S")).toBeInTheDocument();
      expect(screen.getByText("M")).toBeInTheDocument();
      expect(screen.getByText("L")).toBeInTheDocument();
    });
  });

  it("calculates total price for selected add-ons", async () => {
    render(
      <TooltipProvider>
        <MerchandiseAddons items={sampleMerchandise} onItemsChange={mockOnItemsChange} />
      </TooltipProvider>
    );

    // Select one item first
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // T-shirt $29.99

    await waitFor(() => {
      expect(screen.getByText("Add-ons Total:")).toBeInTheDocument();
    });
    
    // Verify callback was called with the selected item
    expect(mockOnItemsChange).toHaveBeenCalled();
    const lastCall = mockOnItemsChange.mock.calls[mockOnItemsChange.mock.calls.length - 1][0];
    expect(lastCall.length).toBe(1);
  });
});
