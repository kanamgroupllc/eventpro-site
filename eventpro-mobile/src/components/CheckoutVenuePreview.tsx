import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { SeatResponse } from "@eventpro/shared";
import type { Theme } from "../theme";
import { sectionLabel } from "../theme/screenStyles";

type Props = {
  seats: SeatResponse[];
  selectedSeatIds: string[];
  theme: Theme;
};

export function CheckoutVenuePreview({ seats, selectedSeatIds, theme }: Props) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selected = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  const rows = useMemo(() => {
    const set = new Set<string>();
    seats.forEach((s) => set.add(s.row));
    return Array.from(set).sort();
  }, [seats]);

  const seatsByRow = useMemo(() => {
    const map = new Map<string, SeatResponse[]>();
    seats.forEach((s) => {
      const list = map.get(s.row) ?? [];
      list.push(s);
      map.set(s.row, list);
    });
    map.forEach((list) => list.sort((a, b) => a.seatNumber - b.seatNumber));
    return map;
  }, [seats]);

  if (!seats.length || !selectedSeatIds.length) return null;

  const sectionLabelText = seats.find((s) => selected.has(s.id))?.section ?? seats[0]?.section;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[sectionLabel(theme), styles.title]}>Your seats</Text>
      {sectionLabelText ? (
        <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>{sectionLabelText}</Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapScroll}>
        <View>
          <Text style={[styles.stage, { color: theme.colors.mutedForeground }]}>STAGE</Text>
          {rows.map((row) => (
            <View key={row} style={styles.row}>
              <Text style={[styles.rowLabel, { color: theme.colors.mutedForeground }]}>{row}</Text>
              <View style={styles.seatRow}>
                {(seatsByRow.get(row) ?? []).map((seat) => {
                  const isSelected = selected.has(seat.id);
                  const isUnavailable = seat.status.toUpperCase() === "SOLD" || seat.status.toUpperCase() === "RESERVED";
                  return (
                    <View
                      key={seat.id}
                      style={[
                        styles.seat,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : isUnavailable
                              ? theme.colors.muted
                              : theme.colors.primary + "40",
                        },
                        isSelected && styles.seatSelected,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    title: { marginBottom: 4 },
    subtitle: { fontSize: 12, marginBottom: 12 },
    mapScroll: { paddingBottom: 4 },
    stage: { fontSize: 10, fontWeight: "700", textAlign: "center", marginBottom: 10, letterSpacing: 1 },
    row: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
    rowLabel: { width: 20, fontSize: 11, fontWeight: "600" },
    seatRow: { flexDirection: "row", gap: 4 },
    seat: { width: 14, height: 14, borderRadius: 3 },
    seatSelected: { borderWidth: 2, borderColor: theme.colors.primary },
  });
}
