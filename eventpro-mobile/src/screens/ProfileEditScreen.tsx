import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard, sectionLabel } from "../theme/screenStyles";
import { lightTheme } from "../theme";
import { uploadProfilePicture as uploadProfilePictureMobile } from "../lib/mobileApi";

const CULTURAL_OPTIONS = [
  "West African Cultural Events",
  "Cultural & Community Events",
  "Afro-Caribbean & Diaspora",
  "Diaspora & Heritage",
  "Live Music & Festivals",
  "Conference & Professional",
  "Other",
];

export function ProfileEditScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { user, refreshUser, hasRole, api } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [culturalNiche, setCulturalNiche] = useState(user?.culturalNiche ?? "");
  const [publicProfile, setPublicProfile] = useState(true);
  const [showTickets, setShowTickets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = [
    styles.input,
    {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.primary + "12",
      color: theme.colors.foreground,
    },
  ];

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setPhoneNumber(user?.phoneNumber ?? "");
    setBio(user?.bio ?? "");
    setLocation(user?.location ?? "");
    setCulturalNiche(user?.culturalNiche ?? "");
  }, [user]);

  const email = user?.email ?? "";
  const usernameHandle = email.includes("@")
    ? `@${email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9_]/g, "")
        .slice(0, 20) || "you"}`
    : "@you";
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Your name";

  const handleChangePhoto = useCallback(async () => {
    if (uploadingPhoto) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photos to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      await uploadProfilePictureMobile({
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: asset.fileName ?? "profile.jpg",
      });
      await refreshUser();
    } catch {
      Alert.alert("Upload failed", "Could not update profile picture.");
    } finally {
      setUploadingPhoto(false);
    }
  }, [refreshUser, uploadingPhoto]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.updateUser({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phoneNumber: phoneNumber || undefined,
        bio: bio || undefined,
        location: location || undefined,
        culturalNiche: culturalNiche || undefined,
      });
      await refreshUser();
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account?",
      "This cannot be undone. Contact support from your registered email to request account deletion.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "OK", style: "default" },
      ]
    );
  };

  const showCulturalNiche = hasRole("ORGANIZER") || hasRole("ADMIN");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>Edit profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.avatarBlock}>
          <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto} activeOpacity={0.85}>
            <View style={[styles.avatarRing, { borderColor: theme.colors.background }]}>
              {user?.profilePictureUrl ? (
                <Image source={{ uri: user.profilePictureUrl }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + "35" }]}>
                  <Text style={[styles.avatarInitials, { color: theme.colors.primary }]}>
                    {(firstName?.[0] ?? "?").toUpperCase()}
                    {(lastName?.[0] ?? "").toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.cameraFab, { backgroundColor: theme.colors.primary }]}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
                ) : (
                  <Ionicons name="camera" size={16} color={theme.colors.primaryForeground} />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <Text style={[styles.displayName, { color: theme.colors.foreground }]}>{displayName}</Text>
          <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto}>
            <Text style={[styles.changePhoto, { color: theme.colors.primary }]}>Change photo</Text>
          </TouchableOpacity>
        </View>

        <View style={[editorialCard(theme), styles.formCard]}>
          <Text style={[sectionLabel(theme), fieldLabel]}>Full name</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={[...inputStyle, styles.inputHalf]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First"
              placeholderTextColor={theme.colors.mutedForeground}
              autoCapitalize="words"
            />
            <TextInput
              style={[...inputStyle, styles.inputHalf]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last"
              placeholderTextColor={theme.colors.mutedForeground}
              autoCapitalize="words"
            />
          </View>

          <Text style={[sectionLabel(theme), fieldLabel]}>Username</Text>
          <TextInput style={[...inputStyle, styles.inputDisabled]} value={usernameHandle} editable={false} />
          <Text style={[styles.fieldHint, { color: theme.colors.mutedForeground }]}>
            Derived from your email.
          </Text>

          <Text style={[sectionLabel(theme), fieldLabel]}>Email</Text>
          <TextInput
            style={[...inputStyle, styles.inputDisabled]}
            value={email}
            editable={false}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[sectionLabel(theme), fieldLabel]}>Phone</Text>
          <TextInput
            style={inputStyle}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Phone (optional)"
            placeholderTextColor={theme.colors.mutedForeground}
            keyboardType="phone-pad"
          />

          <Text style={[sectionLabel(theme), fieldLabel]}>Bio</Text>
          <TextInput
            style={[...inputStyle, styles.inputMultiline]}
            value={bio}
            onChangeText={setBio}
            placeholder="Short bio"
            placeholderTextColor={theme.colors.mutedForeground}
            multiline
            numberOfLines={4}
          />

          <Text style={[sectionLabel(theme), fieldLabel]}>Location</Text>
          <TextInput
            style={inputStyle}
            value={location}
            onChangeText={setLocation}
            placeholder="City, State (optional)"
            placeholderTextColor={theme.colors.mutedForeground}
          />

          {showCulturalNiche && (
            <>
              <Text style={[sectionLabel(theme), fieldLabel]}>Cultural niche / focus</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {CULTURAL_OPTIONS.map((opt) => {
                  const active = culturalNiche === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setCulturalNiche(opt)}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                          backgroundColor: active ? theme.colors.primary + "22" : theme.colors.card,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: active ? theme.colors.primary : theme.colors.foreground,
                        }}
                        numberOfLines={1}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {error ? <Text style={[styles.error, { color: theme.colors.destructive }]}>{error}</Text> : null}
        </View>

        <View style={[editorialCard(theme), styles.privacyCard]}>
          <Text style={[styles.privacyTitle, { color: theme.colors.foreground }]}>Privacy & visibility</Text>
          <View style={styles.toggleRow}>
            <Ionicons name="globe-outline" size={22} color={theme.colors.primary} style={styles.toggleIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: theme.colors.foreground }]}>Public profile</Text>
              <Text style={[styles.toggleHint, { color: theme.colors.mutedForeground }]}>
                Allow others to find your profile.
              </Text>
            </View>
            <Switch
              value={publicProfile}
              onValueChange={setPublicProfile}
              trackColor={{ false: theme.colors.muted, true: theme.colors.primary + "99" }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.toggleRow}>
            <Ionicons name="ticket-outline" size={22} color={theme.colors.primary} style={styles.toggleIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: theme.colors.foreground }]}>Show my tickets</Text>
              <Text style={[styles.toggleHint, { color: theme.colors.mutedForeground }]}>
                Visible on your public activity feed.
              </Text>
            </View>
            <Switch
              value={showTickets}
              onValueChange={setShowTickets}
              trackColor={{ false: theme.colors.muted, true: theme.colors.primary + "99" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveFull, { backgroundColor: theme.colors.primary }, saving && styles.saveDisabled]}
          onPress={handleSave}
          disabled={saving || uploadingPhoto}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveFullText, { color: theme.colors.primaryForeground }]}>Save changes</Text>
          )}
        </TouchableOpacity>

        <View style={[styles.dangerZone, { borderColor: theme.colors.destructive + "55" }]}>
          <Text style={[styles.dangerLabel, { color: theme.colors.destructive }]}>Danger zone</Text>
          <Text style={[styles.dangerBody, { color: theme.colors.mutedForeground }]}>
            Once deleted, your account and all associated data cannot be recovered. This action is permanent.
          </Text>
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: theme.colors.destructive }]}
            onPress={confirmDelete}
            activeOpacity={0.9}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.deleteBtnText}>Delete account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const fieldLabel = { marginBottom: 6 };

const styles = StyleSheet.create({
  scrollContent: { paddingTop: lightTheme.spacing.sm },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: lightTheme.spacing.lg,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", fontFamily: lightTheme.fontFamily.heading },
  avatarBlock: { alignItems: "center", marginBottom: lightTheme.spacing.lg },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    overflow: "visible",
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 56 },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { fontSize: 36, fontWeight: "700" },
  cameraFab: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  displayName: { fontSize: 18, fontWeight: "800", marginTop: 12, fontFamily: lightTheme.fontFamily.heading },
  changePhoto: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  formCard: { padding: lightTheme.spacing.md, marginBottom: lightTheme.spacing.md, borderRadius: lightTheme.radius.lg },
  nameRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  inputHalf: { flex: 1, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: lightTheme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inputDisabled: { opacity: 0.85 },
  inputMultiline: { minHeight: 100, textAlignVertical: "top" },
  fieldHint: { fontSize: 12, marginTop: -8, marginBottom: 12 },
  chipScroll: { marginBottom: 12, maxHeight: 44 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: lightTheme.radius.full,
    borderWidth: 1,
    marginRight: 8,
    maxWidth: 280,
  },
  error: { marginBottom: 12 },
  privacyCard: { padding: lightTheme.spacing.md, marginBottom: lightTheme.spacing.md },
  privacyTitle: { fontSize: 15, fontWeight: "800", marginBottom: lightTheme.spacing.md },
  toggleRow: { flexDirection: "row", alignItems: "center", marginBottom: lightTheme.spacing.md },
  toggleIcon: { marginRight: 10 },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  toggleHint: { fontSize: 12, marginTop: 2 },
  saveFull: {
    paddingVertical: 16,
    borderRadius: lightTheme.radius.full,
    alignItems: "center",
    marginBottom: lightTheme.spacing.lg,
  },
  saveDisabled: { opacity: 0.75 },
  saveFullText: { fontSize: 17, fontWeight: "800" },
  dangerZone: {
    borderWidth: 2,
    borderRadius: lightTheme.radius.lg,
    padding: lightTheme.spacing.md,
    marginBottom: lightTheme.spacing.xl,
  },
  dangerLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 },
  dangerBody: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: lightTheme.radius.lg,
  },
  deleteBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
