import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";
import { EVENT_FORM_CATEGORIES } from "@eventpro/shared";

const BG = "#F9F5FF";
const PURPLE = "#6344D4";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "https://eventpro.com";

type Step = 1 | 2 | 3;

export function CreateEventWizardScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Music");
  const [subGenre, setSubGenre] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [dateLabel] = useState("June 15, 2024");
  const [startTime, setStartTime] = useState("07:00 PM");
  const [endTime, setEndTime] = useState("11:00 PM");
  const [online, setOnline] = useState(false);
  const [venueSearch, setVenueSearch] = useState("");
  const [gaPrice, setGaPrice] = useState("45.00");
  const [gaCap, setGaCap] = useState("500");
  const [vipPrice, setVipPrice] = useState("125.00");
  const [vipCap, setVipCap] = useState("50");
  const [reservedSeating, setReservedSeating] = useState(false);

  const progress = step === 1 ? 0.2 : step === 2 ? 0.5 : 0.75;
  const bottomActive = step === 1 ? 0 : step === 2 ? 2 : 4;

  const openDraft = () => {
    Linking.openURL(`${WEB_URL}/organizer/events/new`).catch(() => {});
    Alert.alert("Save draft", "Continue editing on the web to save your draft.");
  };

  const publish = () => {
    Linking.openURL(`${WEB_URL}/organizer/events/new`).catch(() => {});
    Alert.alert("Publish", "Finish publishing on the web — your details are ready to copy over.");
  };

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={26} color={PURPLE} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Create Event</Text>
        <TouchableOpacity onPress={openDraft}>
          <Text style={styles.saveDraft}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressWrap}>
        <Text style={styles.stepLabel}>
          {step === 1 && "STEP 1 OF 5 · 20% COMPLETE"}
          {step === 2 && "STEP 2 OF 4 · SCHEDULE & LOCATION"}
          {step === 3 && "STEP 03 — FINALIZE · 75% COMPLETE"}
        </Text>
        <Text style={styles.stepHead}>
          {step === 1 && "Details & Media"}
          {step === 2 && "Schedule & Location"}
          {step === 3 && "Tickets & Capacity"}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Event Identity</Text>
            <Text style={styles.sectionHint}>Give your event a name that pops and categorize it so the right audience finds it.</Text>
            <Text style={styles.fieldLbl}>EVENT TITLE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.primary + "10" }]}
              placeholder="e.g., Midnight Jazz Session"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.fieldLbl}>CATEGORY</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.primary + "10" }]}
              value={category}
              editable={false}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {EVENT_FORM_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, category === c && { backgroundColor: PURPLE }]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.catChipText, category === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fieldLbl}>SUB-GENRE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.primary + "10" }]}
              placeholder="e.g., Bebop, Soul"
              placeholderTextColor="#9ca3af"
              value={subGenre}
              onChangeText={setSubGenre}
            />
            <Text style={styles.fieldLbl}>DESCRIPTION</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: theme.colors.primary + "10", color: theme.colors.foreground }]}
              placeholder="Tell your audience what makes this event unmissable..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Visual Pulse</Text>
            <Text style={styles.sectionHint}>High-quality visuals are the soul of your event listing. Use a 16:9 ratio for the best display.</Text>
            <TouchableOpacity style={styles.uploadBox} activeOpacity={0.85}>
              <View style={[styles.uploadCircle, { backgroundColor: theme.colors.primary + "18" }]}>
                <Ionicons name="cloud-upload-outline" size={32} color={PURPLE} />
              </View>
              <Text style={styles.uploadTitle}>Click to upload Hero Image</Text>
              <Text style={styles.uploadMeta}>RECOMMENDED: 1920×1080PX (MAX 5MB)</Text>
            </TouchableOpacity>
            <Text style={styles.fieldLbl}>PROMOTIONAL VIDEO URL</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.colors.primary + "10" }]}>
              <Ionicons name="play-circle-outline" size={22} color={PURPLE} />
              <TextInput
                style={[styles.inputFlex, { color: theme.colors.foreground }]}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#9ca3af"
                value={videoUrl}
                onChangeText={setVideoUrl}
              />
            </View>
            <Text style={styles.fieldHelp}>SUPPORTS YOUTUBE, VIMEO, OR TWITCH LINKS</Text>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.sectionHeadRow}>
              <Ionicons name="calendar-outline" size={22} color={PURPLE} />
              <Text style={styles.sectionTitle}>Event Schedule</Text>
            </View>
            <Text style={styles.fieldLbl}>DATE</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.colors.primary + "10" }]}>
              <Text style={{ flex: 1, color: theme.colors.foreground }}>{dateLabel}</Text>
              <Ionicons name="calendar" size={20} color={PURPLE} />
            </View>
            <Text style={styles.fieldLbl}>START TIME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.primary + "10" }]}
              value={startTime}
              onChangeText={setStartTime}
            />
            <Text style={styles.fieldLbl}>END TIME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.primary + "10" }]}
              value={endTime}
              onChangeText={setEndTime}
            />
            <View style={styles.sectionHeadRow}>
              <Ionicons name="location-outline" size={22} color={PURPLE} />
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.onlineLbl}>Online Event</Text>
              <Switch value={online} onValueChange={setOnline} trackColor={{ true: PURPLE }} />
            </View>
            <View style={[styles.inputRow, { backgroundColor: theme.colors.primary + "10" }]}>
              <Ionicons name="search" size={20} color={PURPLE} />
              <TextInput
                style={[styles.inputFlex, { color: theme.colors.foreground }]}
                placeholder="Search address or venue name..."
                placeholderTextColor="#9ca3af"
                value={venueSearch}
                onChangeText={setVenueSearch}
              />
            </View>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={48} color={PURPLE} />
              <Text style={styles.mapPhText}>Map preview</Text>
              <View style={styles.mapCard}>
                <Ionicons name="business" size={20} color={PURPLE} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapVenue}>
                    {venueSearch.trim() || "Search for a venue"}
                  </Text>
                  <Text style={styles.mapAddr}>
                    {venueSearch.trim()
                      ? "Confirm the address when you save the event"
                      : "Enter an address or venue name above"}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Tickets & Capacity</Text>
            <Text style={styles.sectionHint}>Configure how guests will attend. Set your pricing strategy and manage venue limitations.</Text>
            <TicketCard
              styles={styles}
              icon="pricetag"
              iconColor={PURPLE}
              name="General Admission"
              price={gaPrice}
              cap={gaCap}
              onPrice={setGaPrice}
              onCap={setGaCap}
              theme={theme}
            />
            <TicketCard
              styles={styles}
              icon="star"
              iconColor="#0A66F0"
              name="VIP Experience"
              price={vipPrice}
              cap={vipCap}
              onPrice={setVipPrice}
              onCap={setVipCap}
              theme={theme}
            />
            <TouchableOpacity style={styles.addTier}>
              <Ionicons name="add" size={22} color={PURPLE} />
              <Text style={{ color: PURPLE, fontWeight: "700" }}>Add Ticket Type</Text>
            </TouchableOpacity>
            <View style={[styles.proBanner, { backgroundColor: theme.colors.primary + "14" }]}>
              <Ionicons name="body-outline" size={24} color={PURPLE} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proTitle}>
                  Reserved Seating <Text style={styles.proBadge}>PRO</Text>
                </Text>
                <Text style={styles.sectionHint}>Allow guests to pick specific seats from your venue map.</Text>
              </View>
              <Switch value={reservedSeating} onValueChange={setReservedSeating} trackColor={{ true: PURPLE }} />
            </View>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + "10" }]}>
              <Ionicons name="information-circle-outline" size={22} color={PURPLE} />
              <Text style={styles.infoText}>
                Setting a total event capacity will automatically stop ticket sales when the limit is reached.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footerActions, { paddingBottom: insets.bottom + 8 }]}>
        {step === 3 ? (
          <View style={styles.publishRow}>
            <TouchableOpacity onPress={() => setStep(2)}>
              <Text style={{ color: theme.colors.mutedForeground, fontWeight: "700" }}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.publishBtn, { backgroundColor: PURPLE }]} onPress={publish}>
              <Text style={styles.publishBtnText}>Publish Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: PURPLE }]}
            onPress={() => setStep((s) => (s === 1 ? 2 : 3) as Step)}
            activeOpacity={0.92}
          >
            <Text style={styles.nextBtnText}>{step === 1 ? "Next: Schedule" : "Next: Tickets"}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.stepNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {[
          { i: 0, icon: "document-text-outline" as const, label: "Details" },
          { i: 1, icon: "cloud-upload-outline" as const, label: "Media" },
          { i: 2, icon: "calendar-outline" as const, label: "Schedule" },
          { i: 3, icon: "location-outline" as const, label: "Location" },
          { i: 4, icon: "ticket-outline" as const, label: "Tickets" },
        ].map(({ i, icon, label }) => (
          <TouchableOpacity
            key={label}
            style={[styles.stepNavItem, bottomActive === i && styles.stepNavActive]}
            onPress={() => {
              if (i === 0 || i === 1) setStep(1);
              else if (i === 2 || i === 3) setStep(2);
              else setStep(3);
            }}
          >
            <Ionicons name={icon} size={22} color={bottomActive === i ? "#fff" : "#9ca3af"} />
            <Text style={[styles.stepNavLabel, bottomActive === i && { color: "#fff" }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TicketCard({
  styles,
  icon,
  iconColor,
  name,
  price,
  cap,
  onPrice,
  onCap,
  theme,
}: {
  styles: ReturnType<typeof createStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  name: string;
  price: string;
  cap: string;
  onPrice: (v: string) => void;
  onCap: (v: string) => void;
  theme: Theme;
}) {
  return (
    <View style={[styles.ticketCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.ticketCardHead}>
        <Ionicons name={icon} size={24} color={iconColor} />
        <Text style={styles.ticketCardName}>{name}</Text>
      </View>
      <View style={styles.ticketFields}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLbl}>PRICE</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.colors.primary + "10" }]}>
            <Text style={{ color: theme.colors.mutedForeground, fontWeight: "700" }}>$</Text>
            <TextInput style={[styles.inputFlex, { color: theme.colors.foreground }]} value={price} onChangeText={onPrice} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLbl}>CAPACITY</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.primary + "10" }]}
            value={cap}
            onChangeText={onCap}
            keyboardType="number-pad"
          />
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1 },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    topTitle: { fontSize: 17, fontWeight: "800", color: "#0A0A0A" },
    saveDraft: { color: PURPLE, fontWeight: "700", fontSize: 15 },
    progressWrap: { paddingHorizontal: 16, marginBottom: 8 },
    stepLabel: { fontSize: 11, fontWeight: "800", color: PURPLE, letterSpacing: 0.5, marginBottom: 8 },
    stepHead: { fontSize: 22, fontWeight: "900", color: "#0A0A0A", marginBottom: 10 },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: theme.colors.primary + "20", overflow: "hidden" },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: PURPLE },
    scroll: { padding: 16, paddingBottom: 120 },
    sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0A0A0A", marginBottom: 6 },
    sectionHint: { fontSize: 14, color: theme.colors.mutedForeground, marginBottom: 14, lineHeight: 20 },
    sectionHeadRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 8 },
    fieldLbl: { fontSize: 11, fontWeight: "800", color: PURPLE, marginBottom: 8, letterSpacing: 0.6 },
    fieldHelp: { fontSize: 10, fontWeight: "700", color: theme.colors.mutedForeground, marginTop: 6, marginBottom: 16, letterSpacing: 0.5 },
    input: {
      borderRadius: 14,
      padding: 14,
      fontSize: 16,
      marginBottom: 14,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    inputFlex: { flex: 1, fontSize: 16, paddingVertical: 0 },
    textarea: { minHeight: 120, borderRadius: 14, padding: 14, marginBottom: 16, fontSize: 16 },
    catRow: { gap: 8, marginBottom: 14, flexDirection: "row" },
    catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.background },
    catChipText: { fontWeight: "700", color: theme.colors.foreground },
    uploadBox: {
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: PURPLE,
      borderRadius: 20,
      padding: 32,
      alignItems: "center",
      marginBottom: 16,
      backgroundColor: theme.colors.primary + "08",
    },
    uploadCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", marginBottom: 12 },
    uploadTitle: { fontWeight: "800", color: "#0A0A0A", marginBottom: 6 },
    uploadMeta: { fontSize: 10, fontWeight: "800", color: theme.colors.mutedForeground, letterSpacing: 0.5 },
    onlineLbl: { fontSize: 13, fontWeight: "600", color: theme.colors.foreground, marginRight: 8 },
    mapPlaceholder: {
      minHeight: 200,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + "12",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      padding: 12,
    },
    mapPhText: { marginTop: 8, color: theme.colors.mutedForeground, fontWeight: "600" },
    mapCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      width: "100%",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mapVenue: { fontWeight: "800", color: theme.colors.foreground },
    mapAddr: { fontSize: 13, color: theme.colors.mutedForeground },
    ticketCard: { borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1 },
    ticketCardHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    ticketCardName: { fontSize: 17, fontWeight: "800", color: theme.colors.foreground },
    ticketFields: { flexDirection: "row", gap: 12 },
    addTier: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: PURPLE,
      marginBottom: 16,
    },
    proBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, marginBottom: 12 },
    proTitle: { fontWeight: "800", color: theme.colors.foreground },
    proBadge: { color: "#0A66F0", fontSize: 12, fontWeight: "900" },
    infoBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, marginBottom: 8 },
    infoText: { flex: 1, fontSize: 13, color: theme.colors.mutedForeground, lineHeight: 18 },
    footerActions: { paddingHorizontal: 16 },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 999,
      marginBottom: 8,
    },
    nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    publishRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    publishBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center" },
    publishBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
    stepNav: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      backgroundColor: "#fff",
      paddingTop: 10,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 10,
    },
    stepNavItem: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 6, borderRadius: 16, minWidth: 56 },
    stepNavActive: { backgroundColor: PURPLE },
    stepNavLabel: { fontSize: 9, fontWeight: "800", color: "#9ca3af", marginTop: 4 },
  });
}
