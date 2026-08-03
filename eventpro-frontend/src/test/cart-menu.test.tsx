import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { CartMenu } from "@/components/CartMenu";

const mockNavigate = vi.fn();
const mockRemoveItem = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    items: [
      {
        id: "cart-item-1",
        ticketTypeId: "general",
        ticketTypeName: "GENERAL Ticket",
        eventName: "Test Event",
        eventId: "event-1",
        quantity: 1,
        price: 25,
      },
    ],
    itemCount: 1,
    totalAmount: 25,
    isLoading: false,
    addItem: vi.fn(),
    removeItem: mockRemoveItem,
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    refreshCart: vi.fn(),
  }),
}));

describe("CartMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const openCart = () => {
    fireEvent.pointerDown(screen.getByRole("button", { name: /open shopping cart/i }), {
      button: 0,
      ctrlKey: false,
    });
  };

  it("closes the cart dropdown when proceeding to checkout", async () => {
    render(
      <BrowserRouter>
        <CartMenu />
      </BrowserRouter>
    );

    openCart();
    expect(await screen.findByText("Shopping Cart")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /proceed to checkout/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/checkout");
    await waitFor(() => {
      expect(screen.queryByText("Shopping Cart")).not.toBeInTheDocument();
    });
  });

  it("keeps the cart dropdown open when removing an item", async () => {
    render(
      <BrowserRouter>
        <CartMenu />
      </BrowserRouter>
    );

    openCart();
    expect(await screen.findByText("Shopping Cart")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove general ticket/i }));

    expect(mockRemoveItem).toHaveBeenCalledWith("cart-item-1");
    expect(screen.getByText("Shopping Cart")).toBeInTheDocument();
  });
});
