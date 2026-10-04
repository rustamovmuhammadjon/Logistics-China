import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ChatMessageDto } from "@logistics/shared";
import { api } from "../api";
import { useSession } from "../session";
import { colors, radius, spacing, type } from "../theme";
import { formatDate, formatTime } from "../format";
import { Notice, ScreenHeader } from "../components/ui";

// An open conversation polls this often — the phone has no live socket.
const THREAD_POLL_MS = 4_000;
const MAX_LENGTH = 2000;

type Row = { kind: "message"; message: ChatMessageDto } | { kind: "day"; key: string; label: string };

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Bugun";
  if (date.toDateString() === yesterday.toDateString()) return "Kecha";
  return formatDate(iso);
}

export function ChatThreadScreen({
  operatorId,
  title,
  subtitle,
  phone,
  onBack,
}: {
  operatorId: string;
  title: string;
  subtitle: string | null;
  phone: string | null;
  onBack: () => void;
}) {
  const { handleError, loadChats } = useSession();
  const [messages, setMessages] = useState<ChatMessageDto[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestId = useRef<string | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const { messages: next } = await api.thread(operatorId);
      const last = next.length > 0 ? next[next.length - 1].id : null;
      // Skip the re-render when nothing changed since the last poll.
      if (last !== latestId.current) {
        latestId.current = last;
        setMessages(next);
      }
      setError(null);
    } catch (err) {
      setError(handleError(err));
    }
  }, [operatorId, handleError]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void load();
    }, THREAD_POLL_MS);
    return () => {
      clearInterval(timer);
      // Reading cleared unread messages server-side; bring the list and
      // the tab badge in line on the way out.
      void loadChats();
    };
  }, [load, loadChats]);

  // Newest first for the inverted list, with a day label after the last
  // message of each day (which renders above it).
  const rows = useMemo<Row[]>(() => {
    const list = messages ?? [];
    const out: Row[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const message = list[i];
      out.push({ kind: "message", message });
      const older = list[i - 1];
      if (!older || dayKey(older.createdAt) !== dayKey(message.createdAt)) {
        out.push({ kind: "day", key: `day-${dayKey(message.createdAt)}`, label: dayLabel(message.createdAt) });
      }
    }
    return out;
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await api.send(operatorId, body);
      latestId.current = message.id;
      setMessages((current) => [...(current ?? []), message]);
      setText("");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSending(false);
    }
  }

  const canSend = text.trim().length > 0 && !sending;

  return (
    <LinearGradient colors={[colors.bg, colors.bgElevated]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <ScreenHeader
              title={title}
              subtitle={subtitle ?? "Dispetcher"}
              onBack={onBack}
              right={
                phone ? (
                  <Pressable
                    onPress={() => void Linking.openURL(`tel:${phone}`)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.call, pressed && { opacity: 0.7 }]}
                    accessibilityLabel="Qo'ng'iroq qilish"
                  >
                    <Feather name="phone" size={18} color={colors.accent} />
                  </Pressable>
                ) : null
              }
            />
          </View>

          {messages === null && !error ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : (
            <FlatList
              data={rows}
              inverted
              keyExtractor={(row) => (row.kind === "message" ? row.message.id : row.key)}
              contentContainerStyle={styles.messages}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Feather name="message-circle" size={28} color={colors.textTertiary} />
                  <Text style={styles.emptyText}>Dispetcherga birinchi xabaringizni yozing.</Text>
                </View>
              }
              renderItem={({ item }) =>
                item.kind === "day" ? (
                  <Text style={styles.day}>{item.label}</Text>
                ) : (
                  <Bubble message={item.message} />
                )
              }
            />
          )}

          {error ? (
            <View style={styles.errorWrap}>
              <Notice message={error} />
            </View>
          ) : null}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Xabar yozing…"
              placeholderTextColor={colors.textTertiary}
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              multiline
              maxLength={MAX_LENGTH}
            />
            <Pressable
              onPress={send}
              disabled={!canSend}
              style={({ pressed }) => [styles.send, !canSend && styles.sendDisabled, pressed && canSend && { opacity: 0.8 }]}
              accessibilityLabel="Yuborish"
            >
              {sending ? <ActivityIndicator color={colors.bg} size="small" /> : <Feather name="send" size={18} color={colors.bg} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Bubble({ message }: { message: ChatMessageDto }) {
  const mine = message.sender === "DRIVER";
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.text}</Text>
        <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  call: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: { marginTop: spacing.xxl },
  messages: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 6, flexGrow: 1 },
  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xl, transform: [{ scaleY: -1 }] },
  emptyText: { ...type.caption, color: colors.textTertiary, textAlign: "center" },
  day: {
    alignSelf: "center",
    fontSize: 12,
    fontWeight: "600",
    color: colors.textTertiary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginVertical: spacing.sm,
    overflow: "hidden",
  },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: colors.surfaceRaised,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  bubbleTextMine: { color: "#fff" },
  bubbleTime: { fontSize: 11, color: colors.textTertiary, alignSelf: "flex-end" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.75)" },
  errorWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: colors.textPrimary,
    fontSize: 15,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
});
