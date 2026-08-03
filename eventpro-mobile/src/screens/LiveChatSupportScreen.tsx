import React, { useState, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";

type Msg = { id: string; from: "agent" | "user"; text: string; time: string; orderCard?: boolean };

const INITIAL: Msg[] = [
  {
    id: "1",
    from: "agent",
    text: "Hey there! I'm Alex. How can I help with your tickets today?",
    time: "09:41 AM",
  },
  {
    id: "2",
    from: "user",
    text: "Hi Alex! I'm having trouble downloading my tickets for the Solstice Festival. The link seems to be expired.",
    time: "09:42 AM",
  },
  {
    id: "3",
    from: "agent",
    text: "I'm sorry to hear that. Let me look into your order. Could you provide the order ID or the email address used for the purchase?",
    time: "09:43 AM",
  },
  {
    id: "4",
    from: "user",
    text: "Here's the order ID. I used julian.vance@email.com.",
    time: "09:44 AM",
    orderCard: true,
  },
];

/**
 * Stitch-style live chat support (mock conversation; no backend).
 */
export function LiveChatSupportScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [
      ...m,
      { id: String(Date.now()), from: "user", text: t, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: String(Date.now() + 1),
          from: "agent",
          text: "Thanks — I've noted that. Is there anything else I can help with?",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 800);
  };

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.from === "user";
    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAgent]}>
        {!isUser ? (
          <View style={[styles.avatar, { backgroundColor: theme.colors.muted }]}>
            <Ionicons name="headset" size={18} color={theme.colors.primary} />
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <View style={{ flex: 1, maxWidth: "82%" }}>
          {item.orderCard ? (
            <View style={[styles.orderCard, { backgroundColor: theme.colors.primary + "33" }]}>
              <Ionicons name="ticket" size={20} color="#fff" />
              <Text style={styles.orderCardText}>ORDER ID #EVT - 99283 - SLST</Text>
            </View>
          ) : null}
          <View
            style={[
              styles.bubble,
              isUser
                ? { backgroundColor: theme.colors.primary, alignSelf: "flex-end" }
                : { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.bubbleText, { color: isUser ? theme.colors.primaryForeground : theme.colors.foreground }]}>
              {item.text}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.time, { color: isUser ? "rgba(255,255,255,0.8)" : theme.colors.mutedForeground }]}>
                {item.time}
              </Text>
              {isUser ? <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.85)" /> : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={{ marginRight: 4 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.agentHead, { backgroundColor: theme.colors.muted }]}>
          <Ionicons name="person" size={20} color={theme.colors.primary} />
          <View style={[styles.online, { backgroundColor: theme.colors.success }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Event Support</Text>
          <Text style={[styles.headerSub, { color: theme.colors.mutedForeground }]}>ACTIVE · ALEX</Text>
        </View>
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="videocam-outline" size={24} color={theme.colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={8} style={{ marginLeft: 12 }}>
          <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.datePill, { backgroundColor: theme.colors.primary + "18" }]}>
        <Text style={[styles.datePillText, { color: theme.colors.primary }]}>TODAY</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.typing, { paddingHorizontal: 16 }]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.muted }]}>
          <Ionicons name="person" size={16} color={theme.colors.mutedForeground} />
        </View>
        <View style={[styles.typingBubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.mutedForeground, fontSize: 13 }}>Alex is typing…</Text>
        </View>
      </View>

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="add-circle-outline" size={26} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="happy-outline" size={24} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.primary + "12", color: theme.colors.foreground }]}
          placeholder="Type your message…"
          placeholderTextColor={theme.colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="mic-outline" size={24} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
          onPress={send}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={18} color={theme.colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  agentHead: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  online: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  headerSub: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 },
  datePill: { alignSelf: "center", paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999, marginVertical: 8 },
  datePillText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  row: { flexDirection: "row", marginBottom: 12, gap: 8 },
  rowAgent: { justifyContent: "flex-start" },
  rowUser: { justifyContent: "flex-end" },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 6, marginTop: 6 },
  time: { fontSize: 11 },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  orderCardText: { color: "#fff", fontWeight: "700", fontSize: 12, flex: 1 },
  typing: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, opacity: 0.85 },
  typingBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 4,
  },
  iconBtn: { padding: 6 },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
