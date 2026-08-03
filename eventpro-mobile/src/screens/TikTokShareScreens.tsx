import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const SIGNAL = "#0A66F0";
const BG = "#F7F7F5";

type ShareParams = {
  eventName?: string;
  venue?: string;
  dateLabel?: string;
  doors?: string;
};

export function TikTokShareTemplateScreen({
  route,
  navigation,
}: {
  route: { params?: ShareParams };
  navigation: { goBack: () => void; navigate: (n: string) => void };
}) {
  const insets = useSafeAreaInsets();
  const p = route.params ?? {};
  const eventName = p.eventName ?? "Neon Echoes Festival";
  const venue = p.venue ?? "THE WAREHOUSE DISTRICT, BERLIN";
  const dateLabel = p.dateLabel ?? "JUNE 15, 2024";
  const doors = p.doors ?? "19:00";

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: BG }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={28} color={SIGNAL} />
        </TouchableOpacity>
        <Text style={styles.brand}>VIBE</Text>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="download-outline" size={26} color={SIGNAL} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.cardWrap}>
          <LinearGradient colors={["#0f172a", "#1e1b4b", "#312e81"]} style={styles.card}>
            <View style={styles.officialBadge}>
              <Text style={styles.officialBadgeText}>OFFICIAL TICKET</Text>
            </View>
            <View style={styles.neonRing} />
            <Text style={styles.going}>I&apos;M GOING!</Text>
            <Text style={styles.eventTitle}>{eventName}</Text>
            <Text style={styles.venue}>{venue}</Text>
            <View style={styles.grid2}>
              <View style={styles.glassBox}>
                <Text style={styles.glassLbl}>DATE</Text>
                <Text style={styles.glassVal}>{dateLabel}</Text>
              </View>
              <View style={styles.glassBox}>
                <Text style={styles.glassLbl}>DOORS</Text>
                <Text style={styles.glassVal}>{doors}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.qrPlaceholder} />
              <Text style={styles.scanHint}>SCAN TO JOIN THE…</Text>
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={() => navigation.navigate("TikTokShareSave")} activeOpacity={0.92}>
          <Ionicons name="share-social" size={22} color="#fff" />
          <Text style={styles.shareBtnText}>Share to Stories</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottomUtil, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity>
          <Ionicons name="grid-outline" size={26} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.utilFab}>
          <Ionicons name="share-social" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function TikTokShareSaveScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: BG, justifyContent: "center" }]}>
      <TouchableOpacity style={[styles.topBar, { position: "absolute", top: insets.top, left: 0, right: 0, zIndex: 2 }]} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={28} color={SIGNAL} />
        <Text style={styles.brand}>VIBE</Text>
        <View style={{ width: 28 }} />
      </TouchableOpacity>
      <View style={{ alignItems: "center", paddingHorizontal: 24 }}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
        </View>
        <Text style={styles.saveTitle}>Saved to gallery</Text>
        <Text style={styles.saveSub}>Your story graphic is ready to post.</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.shareBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  brand: { fontSize: 22, fontWeight: "900", color: SIGNAL, letterSpacing: 2 },
  cardWrap: { marginHorizontal: 16, marginTop: 8 },
  card: { borderRadius: 28, padding: 20, minHeight: 420, overflow: "hidden" },
  officialBadge: {
    alignSelf: "flex-start",
    backgroundColor: SIGNAL,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  officialBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  neonRing: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: "rgba(56, 189, 248, 0.5)",
    opacity: 0.7,
  },
  going: { fontSize: 36, fontWeight: "900", color: "#fff", marginTop: 120, marginBottom: 12 },
  eventTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  venue: { fontSize: 12, fontWeight: "700", color: "#a5b4fc", marginTop: 8, letterSpacing: 1 },
  grid2: { flexDirection: "row", gap: 12, marginTop: 24 },
  glassBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  glassLbl: { fontSize: 10, fontWeight: "800", color: "#c4b5fd", marginBottom: 4 },
  glassVal: { fontSize: 14, fontWeight: "900", color: "#fff" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28 },
  qrPlaceholder: { width: 56, height: 56, borderRadius: 8, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)" },
  scanHint: { fontSize: 10, color: "rgba(255,255,255,0.35)", maxWidth: 120 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: SIGNAL,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 999,
  },
  shareBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  bottomUtil: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  utilFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SIGNAL,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -28,
  },
  successIcon: { marginBottom: 16 },
  saveTitle: { fontSize: 24, fontWeight: "900", color: "#1e1b4b", marginBottom: 8 },
  saveSub: { fontSize: 15, color: "#6b7280", textAlign: "center", marginBottom: 24 },
});
