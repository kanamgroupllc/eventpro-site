import { useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { formatTicketTypeName } from "@eventpro/shared";

export const CartMenu = () => {
  const { items, itemCount, totalAmount, removeItem } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleProceedToCheckout = () => {
    setOpen(false);
    navigate("/checkout");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open shopping cart">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-accent text-accent-foreground">
              {itemCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="p-2">
          <h3 className="font-semibold">Shopping Cart</h3>
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Your cart is empty
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 hover:bg-secondary/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{formatTicketTypeName(item.ticketTypeName)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      ${(item.quantity * item.price).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label={`Remove ${item.ticketTypeName}`}
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="p-2">
              <p className="text-xs text-muted-foreground mb-2">
                At checkout, tickets are held for 15 minutes to complete payment.
              </p>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Total:</span>
                <span className="font-bold">${totalAmount.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-gradient-primary"
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
