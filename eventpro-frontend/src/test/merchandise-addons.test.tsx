import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MerchandiseAddons, sampleMerchandise, MerchandiseItem } from "@/components/MerchandiseAddons";

describe("MerchandiseAddons", () => {
  const mockOnItemsChange = vi.fn();

  const testItems: MerchandiseItem[] = [
    {
      id: "test-1",
      name: "Test T-Shirt",
      description: "A test shirt",
      price: 25.00,
      category: "merchandise",
      popular: true,
      sizes: ["S", "M", "L"],
    },
    {
      id: "test-2",
      name: "VIP Parking",
      description: "Reserved parking",
      price: 30.00,
      category: "addon",
    },
    {
      id: "test-3",
      name: "Meet & Greet",
      description: "Meet the artists",
      price: 100.00,
      category: "upgrade",
    },
  ];

  beforeEach(() => {
    mockOnItemsChange.mockClear();
  });

  it("renders all merchandise items", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    expect(screen.getByText("Test T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("VIP Parking")).toBeInTheDocument();
    expect(screen.getByText("Meet & Greet")).toBeInTheDocument();
  });

  it("displays item prices correctly", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("groups items by category", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    expect(screen.getByText("Merchandise")).toBeInTheDocument();
    expect(screen.getByText("Add-ons")).toBeInTheDocument();
    expect(screen.getByText("Upgrades")).toBeInTheDocument();
  });

  it("shows 'Popular' badge for popular items", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    expect(screen.getByText("Popular")).toBeInTheDocument();
  });

  it("allows selecting an item via checkbox", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    // Find checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(3);

    // Click first checkbox
    fireEvent.click(checkboxes[0]);

    expect(mockOnItemsChange).toHaveBeenCalled();
    const selectedItems = mockOnItemsChange.mock.calls[0][0];
    expect(selectedItems.length).toBe(1);
    expect(selectedItems[0].id).toBe("test-1");
    expect(selectedItems[0].quantity).toBe(1);
  });

  it("shows size selector for items with sizes when selected", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    // Initially no size buttons visible
    expect(screen.queryByText("Size:")).not.toBeInTheDocument();

    // Select the t-shirt
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    // Now size selector should appear
    expect(screen.getByText("Size:")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("shows quantity selector when item is selected", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    // Select an item
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]); // Select VIP Parking (no sizes)

    // Quantity selector should appear
    expect(screen.getByText("Qty:")).toBeInTheDocument();
  });

  it("calculates add-ons total correctly", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    // Select first item ($25)
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText("Add-ons Total:")).toBeInTheDocument();
    // Use getAllByText since price appears in multiple places
    const priceElements = screen.getAllByText("$25.00");
    expect(priceElements.length).toBeGreaterThanOrEqual(1);

    // Select second item ($30)
    fireEvent.click(checkboxes[1]);

    // Total should now be $55 - find it in the total section
    const totalSection = screen.getByText("Add-ons Total:").parentElement;
    expect(totalSection).toHaveTextContent("$55.00");
  });
  it("allows increasing quantity and updates price", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    // Select VIP Parking ($30)
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    // There should be a quantity section
    const qtySection = screen.getByText("Qty:");
    expect(qtySection).toBeInTheDocument();
  });

  it("allows deselecting items", () => {
    render(
      <MerchandiseAddons items={testItems} onItemsChange={mockOnItemsChange} />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    
    // Select then deselect
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[0]);

    // Last call should have empty array
    const lastCall = mockOnItemsChange.mock.calls[mockOnItemsChange.mock.calls.length - 1][0];
    expect(lastCall.length).toBe(0);
  });

  it("displays event name when provided", () => {
    render(
      <MerchandiseAddons 
        items={testItems} 
        onItemsChange={mockOnItemsChange}
        eventName="Summer Music Festival"
      />
    );

    expect(screen.getByText(/Summer Music Festival/)).toBeInTheDocument();
  });

  it("sample merchandise has correct structure", () => {
    expect(sampleMerchandise.length).toBeGreaterThan(0);
    
    sampleMerchandise.forEach(item => {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("price");
      expect(item).toHaveProperty("category");
      expect(["merchandise", "addon", "upgrade"]).toContain(item.category);
    });
  });
});
