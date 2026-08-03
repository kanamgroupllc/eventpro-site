import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { CartResponse, CartItemResponse, TicketTypeEnum } from "@/types/api";
import { formatTicketTypeName } from "@eventpro/shared";
import { useQueryClient } from "@tanstack/react-query";
import { getUserFacingApiError } from "@/lib/api-errors";

interface CartItem {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  eventName: string;
  eventId: string;
  quantity: number;
  price: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  isLoading: boolean;
  addItem: (item: Omit<CartItem, "id">, silent?: boolean) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("eventpro-cart");
    broadcastRef.current = channel;
    channel.onmessage = (message: MessageEvent<{ eventIds?: string[] }>) => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      for (const eventId of message.data?.eventIds ?? []) {
        void queryClient.invalidateQueries({ queryKey: ["event-inventory", eventId] });
      }
      if (isAuthenticated) void refreshCart();
    };
    return () => { channel.close(); broadcastRef.current = null; };
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    if (isAuthenticated) {
      syncCartOnAuth();
    } else {
      loadLocalCart();
    }
  }, [isAuthenticated]);

  const GUEST_CART_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  const setCartItems = (cartItems: CartItem[]) => {
    itemsRef.current = cartItems;
    setItems(cartItems);
  };

  const notifyCartChanged = (eventIds: string[], broadcast = true) => {
    const uniqueIds = Array.from(new Set(eventIds.filter(Boolean)));
    uniqueIds.forEach((eventId) => void queryClient.invalidateQueries({ queryKey: ["event-inventory", eventId] }));
    if (broadcast) broadcastRef.current?.postMessage({ type: "invalidate", eventIds: uniqueIds });
  };

  const loadLocalCart = () => {
    try {
      const stored = localStorage.getItem("eventpro_cart");
      const savedAtRaw = localStorage.getItem("eventpro_cart_saved_at");
      if (!stored) return;
      const savedAt = savedAtRaw ? parseInt(savedAtRaw, 10) : NaN;
      if (!savedAtRaw || Number.isNaN(savedAt)) {
        localStorage.removeItem("eventpro_cart");
        localStorage.removeItem("eventpro_cart_saved_at");
        setCartItems([]);
        return;
      }
      const age = Date.now() - savedAt;
      if (age > GUEST_CART_MAX_AGE_MS) {
        localStorage.removeItem("eventpro_cart");
        localStorage.removeItem("eventpro_cart_saved_at");
        setCartItems([]);
        return;
      }
      const cartItems = JSON.parse(stored) as CartItem[];
      setCartItems(cartItems);
    } catch (error) {
      console.error("Failed to load local cart:", error);
      localStorage.removeItem("eventpro_cart");
      localStorage.removeItem("eventpro_cart_saved_at");
      setCartItems([]);
    }
  };

  const saveLocalCart = (cartItems: CartItem[]) => {
    try {
      localStorage.setItem("eventpro_cart", JSON.stringify(cartItems));
      localStorage.setItem("eventpro_cart_saved_at", String(Date.now()));
    } catch (error) {
      console.error("Failed to save local cart:", error);
    }
  };

  const syncCartOnAuth = async () => {
    setIsLoading(true);
    try {
      const localCart = localStorage.getItem("eventpro_cart");
      if (localCart) {
        const localItems = JSON.parse(localCart) as CartItem[];
        await apiService.importCart(localItems.map((item) => {
          const isTicketId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.ticketTypeId);
          return isTicketId
            ? { eventId: item.eventId, ticketId: item.ticketTypeId, quantity: 1 }
            : { eventId: item.eventId, ticketType: item.ticketTypeId as TicketTypeEnum, quantity: item.quantity };
        }));
        localStorage.removeItem("eventpro_cart");
      }
      await refreshCart();
    } catch (error) {
      console.error("Failed to sync cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCart = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const cartData = await queryClient.fetchQuery({
        queryKey: ["cart"], queryFn: () => apiService.getCart(), staleTime: 0,
      });
      const mappedItems: CartItem[] = cartData.tickets.map((ticket: CartItemResponse) => {
        const ticketTypeId = ticket.ticketType ?? ticket.id;
        const existing = itemsRef.current.find(
          (i) => i.eventId === (ticket.eventIdType || "") && i.ticketTypeId === ticketTypeId
        );
        return {
          id: ticket.id,
          ticketTypeId,
          ticketTypeName: formatTicketTypeName(existing?.ticketTypeName ?? ticket.name),
          eventName: existing?.eventName ?? ticket.name,
          eventId: ticket.eventIdType || "",
          quantity: ticket.quantity,
          price: ticket.price,
        };
      });
      const changedEventIds = [
        ...itemsRef.current.map((item) => item.eventId),
        ...mappedItems.map((item) => item.eventId),
      ];
      setCartItems(mappedItems);
      notifyCartChanged(changedEventIds, false);
    } catch (error) {
      console.error("Failed to refresh cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (item: Omit<CartItem, "id">, silent = false): Promise<boolean> => {
    const newItem: CartItem = {
      ...item,
      id: `${item.ticketTypeId}-${Date.now()}`,
    };

    const existingIndex = items.findIndex(
      (i) => i.eventId === item.eventId && i.ticketTypeId === item.ticketTypeId
    );

    if (!isAuthenticated) {
      if (existingIndex >= 0) {
        const updated = [...items];
        updated[existingIndex].quantity = Math.min(4, updated[existingIndex].quantity + item.quantity);
        setCartItems(updated);
        saveLocalCart(updated);
      } else {
        const updated = [...items, newItem];
        setCartItems(updated);
        saveLocalCart(updated);
      }
    }

    if (isAuthenticated) {
      try {
        const isTicketId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.ticketTypeId);
        if (isTicketId) await apiService.addSeat(item.ticketTypeId);
        else await apiService.addGeneralAdmission(item.eventId, item.ticketTypeId as TicketTypeEnum, item.quantity);
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await refreshCart();
      } catch (error) {
        console.error("Failed to add to cart:", error);
        await refreshCart(); // revert to server state
        toast({
          title: "Could not add to cart",
          description: getUserFacingApiError(error, "Please try again."),
          variant: "destructive",
        });
        return false;
      }
    }

    notifyCartChanged([item.eventId]);
    if (!silent) {
      toast({
        title: "Added to cart",
        description: `${item.ticketTypeName} added to your cart`,
      });
    }
    return true;
  };

  const removeItem = async (itemId: string): Promise<boolean> => {
    const removedItem = items.find((item) => item.id === itemId);
    const updated = items.filter((item) => item.id !== itemId);
    if (!isAuthenticated) {
      setCartItems(updated);
      saveLocalCart(updated);
    } else {
      try {
        const isSeat = removedItem ? /^[0-9a-f-]{36}$/i.test(removedItem.ticketTypeId) : false;
        if (removedItem && isSeat) await apiService.removeSeat(removedItem.ticketTypeId);
        else if (removedItem) await apiService.removeGeneralAdmission(removedItem.eventId, removedItem.ticketTypeId as TicketTypeEnum);
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await refreshCart();
      } catch (error) {
        console.error("Failed to remove from cart:", error);
        await refreshCart();
        toast({
          title: "Could not remove item",
          description: getUserFacingApiError(error, "Please try again."),
          variant: "destructive",
        });
        return false;
      }
    }

    notifyCartChanged(removedItem ? [removedItem.eventId] : []);
    toast({
      title: "Removed from cart",
      description: "Item removed from your cart",
    });
    return true;
  };

  const updateQuantity = async (itemId: string, quantity: number): Promise<boolean> => {
    if (quantity <= 0) {
      return removeItem(itemId);
    }

    const changedItem = items.find((item) => item.id === itemId);
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );
    if (!isAuthenticated) {
      setCartItems(updated);
      saveLocalCart(updated);
    } else {
      try {
        if (!changedItem) throw new Error("Cart line not found");
        if (/^[0-9a-f-]{36}$/i.test(changedItem.ticketTypeId)) {
          if (quantity !== 1) throw new Error("Reserved seats always have quantity one");
        } else {
          await apiService.setGeneralAdmission(changedItem.eventId, changedItem.ticketTypeId as TicketTypeEnum, Math.min(4, quantity));
        }
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await refreshCart();
      } catch (error) {
        console.error("Failed to update quantity:", error);
        await refreshCart();
        toast({
          title: "Could not update quantity",
          description: getUserFacingApiError(error, "Please try again."),
          variant: "destructive",
        });
        return false;
      }
    }
    notifyCartChanged(changedItem ? [changedItem.eventId] : []);
    return true;
  };

  const clearCart = async () => {
    const changedEventIds = itemsRef.current.map((item) => item.eventId);
    if (!isAuthenticated) {
      setCartItems([]);
      localStorage.removeItem("eventpro_cart");
      localStorage.removeItem("eventpro_cart_saved_at");
    } else {
      try {
        await apiService.clearCart();
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await refreshCart();
      } catch (error) {
        console.error("Failed to clear cart:", error);
        await refreshCart();
      }
    }
    notifyCartChanged(changedEventIds);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalAmount,
        isLoading,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
