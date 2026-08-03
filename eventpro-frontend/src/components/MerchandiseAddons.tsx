import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingBag, Plus, Minus, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface MerchandiseItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: "merchandise" | "addon" | "upgrade";
  popular?: boolean;
  sizes?: string[];
}

interface SelectedItem extends MerchandiseItem {
  quantity: number;
  selectedSize?: string;
}

interface MerchandiseAddonsProps {
  items: MerchandiseItem[];
  onItemsChange: (items: SelectedItem[]) => void;
  eventName?: string;
}

// Sample merchandise data for demo
export const sampleMerchandise: MerchandiseItem[] = [
  {
    id: "merch-1",
    name: "Event T-Shirt",
    description: "Official event merchandise - 100% cotton",
    price: 29.99,
    category: "merchandise",
    popular: true,
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "merch-2",
    name: "VIP Parking Pass",
    description: "Reserved parking spot near venue entrance",
    price: 25.00,
    category: "addon",
    popular: true,
  },
  {
    id: "merch-3",
    name: "Meet & Greet Upgrade",
    description: "Exclusive access to meet the performers",
    price: 75.00,
    category: "upgrade",
  },
  {
    id: "merch-4",
    name: "Premium Seating Upgrade",
    description: "Upgrade to front-row VIP seating",
    price: 50.00,
    category: "upgrade",
  },
  {
    id: "merch-5",
    name: "Event Poster",
    description: "Limited edition signed poster",
    price: 15.00,
    category: "merchandise",
  },
  {
    id: "merch-6",
    name: "Drink Package",
    description: "2 drinks included with your ticket",
    price: 20.00,
    category: "addon",
  },
];

const categoryLabels = {
  merchandise: "Merchandise",
  addon: "Add-ons",
  upgrade: "Upgrades",
};

const categoryIcons = {
  merchandise: ShoppingBag,
  addon: Plus,
  upgrade: Tag,
};

export const MerchandiseAddons = ({
  items,
  onItemsChange,
  eventName,
}: MerchandiseAddonsProps) => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleToggleItem = (item: MerchandiseItem) => {
    const existingIndex = selectedItems.findIndex((i) => i.id === item.id);
    
    if (existingIndex >= 0) {
      const newItems = selectedItems.filter((i) => i.id !== item.id);
      setSelectedItems(newItems);
      onItemsChange(newItems);
    } else {
      const newItem: SelectedItem = {
        ...item,
        quantity: 1,
        selectedSize: item.sizes?.[1], // Default to M if sizes available
      };
      const newItems = [...selectedItems, newItem];
      setSelectedItems(newItems);
      onItemsChange(newItems);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const newItems = selectedItems.map((item) => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, Math.min(10, item.quantity + delta));
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setSelectedItems(newItems);
    onItemsChange(newItems);
  };

  const updateSize = (itemId: string, size: string) => {
    const newItems = selectedItems.map((item) => {
      if (item.id === itemId) {
        return { ...item, selectedSize: size };
      }
      return item;
    });
    setSelectedItems(newItems);
    onItemsChange(newItems);
  };

  const isItemSelected = (itemId: string) => 
    selectedItems.some((i) => i.id === itemId);

  const getSelectedItem = (itemId: string) =>
    selectedItems.find((i) => i.id === itemId);

  const totalAddonsPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MerchandiseItem[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Enhance Your Experience
        </CardTitle>
        <CardDescription>
          {eventName
            ? `Add merchandise and extras for ${eventName}`
            : "Add merchandise and extras to your order"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          return (
            <div key={category} className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <Icon className="h-4 w-4" />
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h3>
              <div className="space-y-2">
                {categoryItems.map((item) => {
                  const isSelected = isItemSelected(item.id);
                  const selectedItem = getSelectedItem(item.id);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      className={`border rounded-lg p-3 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleItem(item)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {item.popular && (
                              <Badge variant="secondary" className="text-xs">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isSelected && selectedItem && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-4">
                              {/* Size selector for merchandise */}
                              {item.sizes && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    Size:
                                  </span>
                                  <div className="flex gap-1">
                                    {item.sizes.map((size) => (
                                      <button
                                        key={size}
                                        onClick={() => updateSize(item.id, size)}
                                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                                          selectedItem.selectedSize === size
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background border-border hover:border-primary"
                                        }`}
                                      >
                                        {size}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Quantity selector */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  Qty:
                                </span>
                                <div className="flex items-center border rounded-md">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(item.id, -1)}
                                    disabled={selectedItem.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center text-sm">
                                    {selectedItem.quantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(item.id, 1)}
                                    disabled={selectedItem.quantity >= 10}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <div className="ml-auto font-medium">
                                ${(item.price * selectedItem.quantity).toFixed(2)}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {selectedItems.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Add-ons Total:</span>
              <span className="font-bold text-lg">
                ${totalAddonsPrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
