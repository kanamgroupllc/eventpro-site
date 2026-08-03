/**
 * Mobile cart: guest (AsyncStorage) or logged-in (API).
 * Matches web CartContext — guest persistence, reservedUntil, sync on login.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import type { TicketTypeEnum } from "@eventpro/shared";
import { formatTicketTypeName } from "@eventpro/shared";
import { useQueryClient } from "@tanstack/react-query";

export interface CartItem {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  eventName: string;
  eventId: string;
  quantity: number;
  price: number;
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  isLoading: boolean;
  /** ISO-8601 expiry from server cart (authenticated users). */
  reservedUntil: string | null;
  serverTime: string | null;
  addItem: (item: Omit<CartItem, "id">) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const GUEST_CART_KEY = "eventpro_cart";
const GUEST_CART_SAVED_AT_KEY = "eventpro_cart_saved_at";
const GUEST_CART_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { api, user } = useAuth();
  const isAuthenticated = !!user;
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reservedUntil, setReservedUntil] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const setCartItems = useCallback((cartItems: CartItem[]) => {
    itemsRef.current = cartItems;
    setItems(cartItems);
  }, []);

  const loadLocalCart = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(GUEST_CART_KEY);
      const savedAtRaw = await AsyncStorage.getItem(GUEST_CART_SAVED_AT_KEY);
      if (!stored) return;
      const savedAt = savedAtRaw ? parseInt(savedAtRaw, 10) : NaN;
      if (!savedAtRaw || Number.isNaN(savedAt)) {
        await AsyncStorage.multiRemove([GUEST_CART_KEY, GUEST_CART_SAVED_AT_KEY]);
        setCartItems([]);
        return;
      }
      if (Date.now() - savedAt > GUEST_CART_MAX_AGE_MS) {
        await AsyncStorage.multiRemove([GUEST_CART_KEY, GUEST_CART_SAVED_AT_KEY]);
        setCartItems([]);
        return;
      }
      setCartItems(JSON.parse(stored) as CartItem[]);
    } catch {
      await AsyncStorage.multiRemove([GUEST_CART_KEY, GUEST_CART_SAVED_AT_KEY]);
      setCartItems([]);
    }
  }, [setCartItems]);

  const saveLocalCart = useCallback(async (cartItems: CartItem[]) => {
    try {
      await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
      await AsyncStorage.setItem(GUEST_CART_SAVED_AT_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }, []);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const cartData = await queryClient.fetchQuery({ queryKey: ["cart"], queryFn: () => api.getCart(), staleTime: 0 });
      const mapped: CartItem[] = (cartData.tickets ?? []).map(
        (t: { id: string; name: string; ticketType?: string; eventIdType?: string; quantity: number; price: number }) => {
          const ticketTypeId = t.ticketType ?? t.id;
          const existing = itemsRef.current.find(
            (i) => i.eventId === (t.eventIdType ?? "") && i.ticketTypeId === ticketTypeId
          );
          return {
            id: t.id,
            ticketTypeId,
            ticketTypeName: formatTicketTypeName(existing?.ticketTypeName ?? t.name),
            eventName: existing?.eventName ?? t.name,
            eventId: t.eventIdType ?? "",
            quantity: t.quantity,
            price: Number(t.price),
          };
        }
      );
      setCartItems(mapped);
      setReservedUntil(cartData.reservedUntil ?? null);
      setServerTime(cartData.serverTime ?? null);
    } catch {
      setCartItems([]);
      setReservedUntil(null);
      setServerTime(null);
    } finally {
      setIsLoading(false);
    }
  }, [api, isAuthenticated, queryClient, setCartItems]);

  const syncCartOnAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const localCart = await AsyncStorage.getItem(GUEST_CART_KEY);
      if (localCart) {
        const localItems = JSON.parse(localCart) as CartItem[];
        await api.importCart(localItems.map((item) => {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.ticketTypeId);
          return isUuid
            ? { eventId: item.eventId, ticketId: item.ticketTypeId, quantity: 1 }
            : { eventId: item.eventId, ticketType: item.ticketTypeId as TicketTypeEnum, quantity: item.quantity };
        }));
        await AsyncStorage.multiRemove([GUEST_CART_KEY, GUEST_CART_SAVED_AT_KEY]);
      }
      await refreshCart();
    } finally {
      setIsLoading(false);
    }
  }, [api, refreshCart]);

  useEffect(() => {
    if (isAuthenticated) {
      void syncCartOnAuth();
    } else {
      setReservedUntil(null);
      setServerTime(null);
      void loadLocalCart();
    }
  }, [isAuthenticated, syncCartOnAuth, loadLocalCart]);

  const addItem = useCallback(
    async (item: Omit<CartItem, "id">): Promise<boolean> => {
      const newItem: CartItem = {
        ...item,
        id: `${item.ticketTypeId}-${item.eventId}-${Date.now()}`,
      };
      const existingIndex = itemsRef.current.findIndex(
        (i) => i.eventId === item.eventId && i.ticketTypeId === item.ticketTypeId
      );
      let updated: CartItem[];
      if (existingIndex >= 0) {
        updated = itemsRef.current.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: Math.min(4, i.quantity + item.quantity) } : i
        );
      } else {
        updated = [...itemsRef.current, newItem];
      }
      if (!isAuthenticated) {
        setCartItems(updated);
        await saveLocalCart(updated);
        return true;
      }
      setIsLoading(true);
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.ticketTypeId);
        if (isUuid) await api.addSeat(item.ticketTypeId);
        else await api.addGeneralAdmission(item.eventId, item.ticketTypeId as TicketTypeEnum, item.quantity);
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await refreshCart();
        return true;
      } catch {
        await refreshCart();
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [api, isAuthenticated, queryClient, refreshCart, saveLocalCart, setCartItems]
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      const removed = itemsRef.current.find((i) => i.id === itemId);
      const updated = itemsRef.current.filter((i) => i.id !== itemId);
      if (!isAuthenticated) {
        setCartItems(updated);
        await saveLocalCart(updated);
        return true;
      }
      try {
        if (!removed) throw new Error("Cart line not found");
        const isSeat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(removed.ticketTypeId);
        if (isSeat) await api.removeSeat(removed.ticketTypeId);
        else await api.removeGeneralAdmission(removed.eventId, removed.ticketTypeId as TicketTypeEnum);
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await refreshCart();
        return true;
      } catch {
        await refreshCart();
        return false;
      }
    },
    [api, isAuthenticated, queryClient, refreshCart, saveLocalCart, setCartItems]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number): Promise<boolean> => {
      if (quantity <= 0) return removeItem(itemId);
      const changed = itemsRef.current.find((i) => i.id === itemId);
      const updated = itemsRef.current.map((i) => (i.id === itemId ? { ...i, quantity } : i));
      if (!isAuthenticated) {
        setCartItems(updated);
        await saveLocalCart(updated);
        return true;
      }
      try {
        if (!changed) throw new Error("Cart line not found");
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(changed.ticketTypeId)) {
          if (quantity !== 1) throw new Error("Reserved seats always have quantity one");
        } else {
          await api.setGeneralAdmission(changed.eventId, changed.ticketTypeId as TicketTypeEnum, Math.min(4, quantity));
        }
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        await refreshCart();
        return true;
      } catch {
        await refreshCart();
        return false;
      }
    },
    [api, isAuthenticated, queryClient, refreshCart, removeItem, saveLocalCart, setCartItems]
  );

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      setReservedUntil(null);
      setServerTime(null);
      await AsyncStorage.multiRemove([GUEST_CART_KEY, GUEST_CART_SAVED_AT_KEY]);
      return;
    }
    try {
      await api.clearCart();
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      await refreshCart();
    } catch {
      await refreshCart();
    }
  }, [api, isAuthenticated, queryClient, refreshCart, setCartItems]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  const value: CartContextValue = {
    items,
    itemCount,
    totalAmount,
    isLoading,
    reservedUntil,
    serverTime,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
