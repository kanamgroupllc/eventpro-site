import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Linking,
  Modal,
  FlatList,
} from "react-native";
import Constants from "expo-constants";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../contexts/CartContext";
import { ReservationCountdown } from "../components/ReservationCountdown";
import type { CheckoutTotals } from "@eventpro/shared";
import { formatTicketTypeName } from "@eventpro/shared";
import type { SeatResponse } from "@eventpro/shared";
import { CheckoutVenuePreview } from "../components/CheckoutVenuePreview";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";
import { editorialCard, sectionLabel, pageTitle } from "../theme/screenStyles";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "https://eventpro.com";

const US_STATE_OPTIONS: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" }, { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "District of Columbia" },
];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
    summaryCardInner: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    webNoteInner: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.muted,
    },
    webNoteTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.foreground, marginBottom: 6 },
    webNoteBody: { fontSize: 13, lineHeight: 20, color: theme.colors.mutedForeground },
    emptyTitleWrap: { marginBottom: 8, alignItems: "center" },
    emptyDesc: { fontSize: 15, marginBottom: 24, textAlign: "center", color: theme.colors.mutedForeground, lineHeight: 22 },
    sectionLabelSpaced: { marginBottom: 12 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    rowLeft: { flex: 1 },
    itemName: { fontSize: 16, fontWeight: "600", color: theme.colors.foreground },
    itemMeta: { fontSize: 14, marginTop: 2, color: theme.colors.mutedForeground },
    removeBtn: { padding: 8 },
    removeText: { fontSize: 14, color: theme.colors.destructive },
    totals: { marginTop: 0, paddingTop: 4 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    totalRowLast: { marginTop: 8 },
    totalLabel: { fontSize: 15, color: theme.colors.mutedForeground },
    totalValue: { fontSize: 15, color: theme.colors.foreground },
    totalLabelBold: { fontSize: 17, fontWeight: "700", color: theme.colors.foreground },
    totalValueBold: { fontSize: 17, fontWeight: "700", color: theme.colors.foreground },
    button: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: theme.radius.full,
      alignItems: "center",
      marginTop: 8,
      shadowColor: "#5d3fd3",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 6,
    },
    buttonSecondary: {
      backgroundColor: "transparent",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: theme.radius.full,
      alignItems: "center",
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: theme.colors.primaryForeground, fontWeight: "800", fontSize: 16 },
    buttonSecondaryText: { color: theme.colors.foreground, fontWeight: "600", fontSize: 15 },
    guestForm: { marginTop: 16, marginBottom: 16 },
    guestLabel: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: theme.colors.foreground },
    guestInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: theme.colors.card, color: theme.colors.foreground },
    taxRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    taxPicker: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: 14,
      backgroundColor: theme.colors.card,
    },
    taxPickerText: { fontSize: 15, color: theme.colors.foreground },
    taxHint: { fontSize: 12, color: theme.colors.mutedForeground, marginBottom: 12, lineHeight: 18 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: { maxHeight: "70%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
    stateRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    stateRowText: { fontSize: 16 },
  });
}

export function CheckoutScreen({
  route,
  navigation,
}: {
  route: { params?: { eventId?: string } };
  navigation: any;
}) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { api, user } = useAuth();
  const {
    items: cartItems,
    totalAmount: cartTotal,
    isLoading,
    reservedUntil: cartReservedUntil,
    serverTime: cartServerTime,
    removeItem,
    refreshCart,
  } = useCart();
  const [totals, setTotals] = useState<CheckoutTotals | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [guestInfo, setGuestInfo] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
  const [guestForm, setGuestForm] = useState({ firstName: "", lastName: "", email: "" });
  const [taxState, setTaxState] = useState("");
  const [taxCountry] = useState("US");
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [guestReservedUntil, setGuestReservedUntil] = useState<string | null>(null);
  const [guestServerTime, setGuestServerTime] = useState<string | null>(null);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [checkoutResumeUrl, setCheckoutResumeUrl] = useState<string | null>(null);
  const [checkoutSeats, setCheckoutSeats] = useState<SeatResponse[]>([]);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const cartSeatIds = cartItems.filter((i) => UUID_RE.test(i.ticketTypeId)).map((i) => i.ticketTypeId);
  const checkoutEventId = route.params?.eventId ?? cartItems[0]?.eventId;
  const cartFingerprint = cartItems.map((item) => `${item.eventId}:${item.ticketTypeId}:${item.quantity}`).sort().join("|");

  useEffect(() => setCheckoutResumeUrl(null), [cartFingerprint]);

  const isGuest = !user;
  const subtotal = cartTotal;
  const isEmpty = cartItems.length === 0;
  const reservedUntil = isGuest ? guestReservedUntil : cartReservedUntil;
  const canShowCheckout = user || (isGuest && guestInfo);

  useEffect(() => {
    if (!checkoutEventId || cartSeatIds.length === 0) {
      setCheckoutSeats([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const event = await api.getEvent(checkoutEventId);
        if (!event?.reservedSeatingEnabled) {
          if (!cancelled) setCheckoutSeats([]);
          return;
        }
        const seats = await api.getEventSeats(checkoutEventId).catch(() => []);
        if (!cancelled) setCheckoutSeats(Array.isArray(seats) ? seats : []);
      } catch {
        if (!cancelled) setCheckoutSeats([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, checkoutEventId, cartSeatIds.join(",")]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (subtotal <= 0) {
      setTotals(null);
      return;
    }
    api
      .getCheckoutTotals(subtotal, taxState || undefined, taxCountry || undefined)
      .then(setTotals)
      .catch(() => setTotals(null));
  }, [api, subtotal, taxState, taxCountry]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshCart().finally(() => setRefreshing(false));
  };

  const handleReservationExpired = useCallback(() => {
    setGuestReservedUntil(null);
    void refreshCart();
    Alert.alert(
      "Reservation expired",
      "Your ticket hold has expired. Please go back and add tickets again."
    );
  }, [refreshCart]);

  const canProceedAsGuest =
    isGuest &&
    guestInfo === null &&
    guestForm.firstName.trim() !== "" &&
    guestForm.lastName.trim() !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestForm.email.trim());

  const handleContinueAsGuest = () => {
    if (!canProceedAsGuest) return;
    setGuestInfo({
      firstName: guestForm.firstName.trim(),
      lastName: guestForm.lastName.trim(),
      email: guestForm.email.trim(),
    });
  };

  /** Create a server checkout session, then hand the opaque resume URL to the browser. */
  const openWebCheckout = async () => {
    setOpeningCheckout(true);
    try {
      if (checkoutResumeUrl) {
        await Linking.openURL(checkoutResumeUrl);
        return;
      }
      const session = await api.createCheckoutSession({
        idempotencyKey: `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        items: isGuest ? cartItems.map((i) => ({
          eventId: i.eventId,
          ticketType: i.ticketTypeId,
          quantity: i.quantity,
        })) : undefined,
        email: isGuest ? guestInfo?.email : undefined,
        firstName: isGuest ? guestInfo?.firstName : undefined,
        lastName: isGuest ? guestInfo?.lastName : undefined,
        state: taxState || undefined,
        country: taxCountry,
      });
      if (session.expiresAt) setGuestReservedUntil(session.expiresAt);
      if (session.serverTime) setGuestServerTime(session.serverTime);
      const base = WEB_URL.replace(/\/$/, "");
      const resumeUrl = session.checkoutUrl || `${base}/checkout/session/${session.resumeToken}`;
      setCheckoutResumeUrl(resumeUrl);
      await Linking.openURL(resumeUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start checkout";
      Alert.alert("Checkout unavailable", msg);
    } finally {
      setOpeningCheckout(false);
    }
  };

  if (isLoading && cartItems.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const totalAmount = totals?.total ?? subtotal;
  const selectedStateLabel = US_STATE_OPTIONS.find((s) => s.code === taxState)?.name ?? "Select state (for tax)";

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {isEmpty ? (
            <>
              <View style={styles.emptyTitleWrap}>
                <Text style={pageTitle(theme)}>Your cart is empty</Text>
              </View>
              <Text style={styles.emptyDesc}>Add tickets from an event to checkout.</Text>
              <TouchableOpacity style={styles.button} onPress={() => navigation.getParent()?.navigate("Discover")}>
                <Text style={styles.buttonText}>Browse events</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {reservedUntil ? (
                <ReservationCountdown reservedUntil={reservedUntil} serverTime={(isGuest ? guestServerTime : cartServerTime) ?? undefined} onExpired={handleReservationExpired} />
              ) : null}

              {checkoutSeats.length > 0 && cartSeatIds.length > 0 ? (
                <CheckoutVenuePreview seats={checkoutSeats} selectedSeatIds={cartSeatIds} theme={theme} />
              ) : null}

              <Text style={[sectionLabel(theme), { marginBottom: theme.spacing.md }]}>Review & pay</Text>
              <View style={[editorialCard(theme), styles.summaryCardInner]}>
                <Text style={[sectionLabel(theme), styles.sectionLabelSpaced]}>Order summary</Text>
                {cartItems.map((item) => (
                  <View key={item.id} style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text style={styles.itemName}>{formatTicketTypeName(item.ticketTypeName)}</Text>
                      <Text style={styles.itemMeta}>
                        {item.quantity} × ${Number(item.price).toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {isGuest && !guestInfo ? (
                <View style={[styles.guestForm, editorialCard(theme), styles.summaryCardInner]}>
                  <Text style={styles.guestLabel}>Continue as guest (no account required)</Text>
                  <Text style={[styles.guestLabel, { fontSize: 12, fontWeight: "400", color: theme.colors.mutedForeground }]}>
                    First name
                  </Text>
                  <TextInput
                    style={styles.guestInput}
                    placeholder="First name"
                    placeholderTextColor={theme.colors.mutedForeground}
                    value={guestForm.firstName}
                    onChangeText={(t) => setGuestForm((f) => ({ ...f, firstName: t }))}
                  />
                  <Text style={[styles.guestLabel, { fontSize: 12, fontWeight: "400", color: theme.colors.mutedForeground }]}>
                    Last name
                  </Text>
                  <TextInput
                    style={styles.guestInput}
                    placeholder="Last name"
                    placeholderTextColor={theme.colors.mutedForeground}
                    value={guestForm.lastName}
                    onChangeText={(t) => setGuestForm((f) => ({ ...f, lastName: t }))}
                  />
                  <Text style={[styles.guestLabel, { fontSize: 12, fontWeight: "400", color: theme.colors.mutedForeground }]}>
                    Email *
                  </Text>
                  <TextInput
                    style={styles.guestInput}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.mutedForeground}
                    value={guestForm.email}
                    onChangeText={(t) => setGuestForm((f) => ({ ...f, email: t }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.button, !canProceedAsGuest && styles.buttonDisabled]}
                    onPress={handleContinueAsGuest}
                    disabled={!canProceedAsGuest}
                  >
                    <Text style={styles.buttonText}>Continue as guest</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {canShowCheckout ? (
                <View style={[editorialCard(theme), styles.summaryCardInner]}>
                  <Text style={[sectionLabel(theme), styles.sectionLabelSpaced]}>Billing location</Text>
                  <Text style={styles.taxHint}>Used to calculate sales tax, same as web checkout.</Text>
                  <TouchableOpacity style={styles.taxPicker} onPress={() => setStatePickerOpen(true)}>
                    <Text style={[styles.taxPickerText, !taxState && { color: theme.colors.mutedForeground }]}>
                      {taxState ? `${selectedStateLabel} (${taxState})` : selectedStateLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {canShowCheckout && totals ? (
                <View style={[styles.totals, editorialCard(theme), styles.summaryCardInner]}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>${totals.subtotal.toFixed(2)}</Text>
                  </View>
                  {totals.taxRatePercent != null && totals.taxRatePercent > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Tax ({totals.taxRatePercent}%)</Text>
                      <Text style={styles.totalValue}>${totals.tax.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.totalRow, styles.totalRowLast]}>
                    <Text style={styles.totalLabelBold}>Total</Text>
                    <Text style={styles.totalValueBold}>${totals.total.toFixed(2)}</Text>
                  </View>
                </View>
              ) : canShowCheckout ? (
                <View style={[styles.totals, editorialCard(theme), styles.summaryCardInner]}>
                  <View style={[styles.totalRow, styles.totalRowLast]}>
                    <Text style={styles.totalLabelBold}>Total</Text>
                    <Text style={styles.totalValueBold}>${totalAmount.toFixed(2)}</Text>
                  </View>
                </View>
              ) : null}

              {canShowCheckout && (
                <>
                  <View style={[editorialCard(theme), styles.webNoteInner]}>
                    <Text style={styles.webNoteTitle}>Pay with card</Text>
                    <Text style={styles.webNoteBody}>
                      {isGuest
                        ? "We'll hold your tickets for 15 minutes, then open secure Stripe checkout in your browser. Use the same email so your order is linked."
                        : "Your cart is reserved on the server. Complete payment in your browser with the same account."}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.button, openingCheckout && styles.buttonDisabled]}
                    onPress={() => void openWebCheckout()}
                    activeOpacity={0.9}
                    disabled={openingCheckout}
                  >
                    {openingCheckout ? (
                      <ActivityIndicator color={theme.colors.primaryForeground} />
                    ) : (
                      <Text style={styles.buttonText}>Open web checkout</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.buttonSecondary}
                    onPress={() => navigation.navigate("EventsList")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.buttonSecondaryText}>Keep browsing events</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={statePickerOpen} transparent animationType="slide" onRequestClose={() => setStatePickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStatePickerOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>Select state</Text>
            <FlatList
              data={US_STATE_OPTIONS}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.stateRow, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setTaxState(item.code);
                    setStatePickerOpen(false);
                  }}
                >
                  <Text style={[styles.stateRowText, { color: theme.colors.foreground }]}>
                    {item.name} ({item.code})
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
