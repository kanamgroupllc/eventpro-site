import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";

const { height: SCREEN_H } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onClose: () => void;
  eventName: string;
  dateLine?: string;
  venueLine?: string;
};

/**
 * Stitch-style Instagram Story share template + save confirmation overlay (UI only).
 */
export function InstagramStoryTemplate({ visible, onClose, eventName, dateLine, venueLine }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [savedToast, setSavedToast] = useState(false);

  const handleDownload = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2800);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
          }}
          style={styles.bg}
          imageStyle={styles.bgImg}
        >
          <View style={styles.bgTint} />
          <View style={[styles.topBar, { paddingHorizontal: 16 }]}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} hitSlop={12}>
              <Ionicons name="download-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          {savedToast ? (
            <View style={styles.toast}>
              <View style={styles.toastIcon}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
              <Text style={styles.toastText}>Saved to Camera Roll</Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Ionicons name="flash" size={14} color="#fff" />
              </View>
              <Text style={styles.brandText}>VIBE</Text>
            </View>
            <Text style={styles.imGoing}>I&apos;M GOING!</Text>
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>CONFIRMED ACCESS</Text>
            </View>

            <View style={[styles.ticketCard, { marginTop: 24 }]}>
              <Text style={[styles.eventTitle, { color: theme.colors.foreground }]}>{eventName}</Text>
              <Text style={styles.eventSub}>ELECTRONIC AUDIO-VISUAL EXPERIENCE</Text>
              <View style={[styles.dashed, { borderColor: theme.colors.border }]} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>DATE &amp; TIME</Text>
                  <Text style={[styles.metaVal, { color: theme.colors.foreground }]}>{dateLine ?? "June 15, 2024"}</Text>
                  <Text style={styles.timeLate}>19:00 — LATE</Text>
                  <Text style={[styles.metaLabel, { marginTop: 12 }]}>VENUE</Text>
                  <Text style={[styles.metaVal, { color: theme.colors.foreground }]} numberOfLines={2}>
                    {venueLine ?? "The Warehouse District"}
                  </Text>
                </View>
                <View style={styles.qrCol}>
                  <View style={[styles.qrBox, { backgroundColor: theme.colors.primary + "22" }]}>
                    <Ionicons name="qr-code" size={56} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.scanLabel, { color: theme.colors.primary }]}>SCAN FOR ENTRY</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0b1e" },
  bg: { flex: 1, minHeight: SCREEN_H },
  bgImg: { opacity: 0.85 },
  bgTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,8,40,0.75)" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  toast: {
    position: "absolute",
    top: 56,
    alignSelf: "center",
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  toastIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },
  toastText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 72 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#8e3a56",
    justifyContent: "center",
    alignItems: "center",
  },
  brandText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  imGoing: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    fontStyle: "italic",
    textAlign: "center",
    textShadowColor: "rgba(236,72,153,0.5)",
    textShadowRadius: 16,
  },
  confirmedBadge: {
    alignSelf: "center",
    marginTop: 14,
    backgroundColor: "#8e3a56",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  confirmedText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  ticketCard: {
    backgroundColor: "#faf9fc",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  eventTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  eventSub: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#4c1d95",
    textAlign: "center",
    marginTop: 6,
  },
  dashed: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginVertical: 16,
  },
  row: { flexDirection: "row", gap: 12 },
  metaLabel: { fontSize: 10, color: "#71717a", fontWeight: "700", letterSpacing: 0.8 },
  metaVal: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  timeLate: { fontSize: 14, fontWeight: "700", color: "#8e3a56", marginTop: 4 },
  qrCol: { alignItems: "center", width: 100 },
  qrBox: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  scanLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8, marginTop: 8 },
});
