import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DriverChatSummaryDto } from "@logistics/shared";
import { useSession } from "../session";
import { useNav } from "../navigation";
import { colors, radius, spacing, type } from "../theme";
import { formatRelative } from "../format";
import { Avatar, EmptyState, Notice, Screen, ScreenHeader } from "../components/ui";

const LIST_POLL_MS = 15_000;

function splitName(name: string) {
  const [first, ...rest] = name.split(" ");
  return { first, last: rest.join(" ") };
}

export function ChatsScreen({ active }: { active: boolean }) {
  const { chats, loadChats } = useSession();
  const nav = useNav();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh every time the tab is shown, then kept current while it stays open.
  useEffect(() => {
    if (!active) return;
    void loadChats().then(setError);
    const timer = setInterval(() => void loadChats().then(setError), LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [active, loadChats]);

  async function onRefresh() {
    setRefreshing(true);
    setError(await loadChats());
    setRefreshing(false);
  }

  function open(chat: DriverChatSummaryDto) {
    nav.push({
      name: "thread",
      operatorId: chat.operator.id,
      title: chat.operator.name,
      subtitle: chat.operator.companyName,
      phone: chat.operator.phone,
    });
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenHeader title="Chat" subtitle="Sizni reysga ulagan dispetcherlar bilan yozishmalar" />
      {error ? <Notice message={error} /> : null}

      {chats && chats.length === 0 ? (
        <EmptyState
          icon="message-circle"
          title="Hali suhbatlar yo'q"
          text="Operator sizni kod orqali reysga ulaganida, u bilan shu yerda yozishishingiz mumkin bo'ladi."
        />
      ) : null}

      <View style={styles.list}>
        {(chats ?? []).map((chat) => {
          const { first, last } = splitName(chat.operator.name);
          const preview = chat.lastMessage
            ? `${chat.lastMessage.sender === "DRIVER" ? "Siz: " : ""}${chat.lastMessage.text}`
            : "Hali xabar yo'q — birinchi bo'lib yozing";
          return (
            <Pressable
              key={chat.operator.id}
              onPress={() => open(chat)}
              style={({ pressed }) => [styles.row, chat.current && styles.rowCurrent, pressed && styles.pressed]}
            >
              <Avatar firstName={first} lastName={last} size={48} />
              <View style={styles.body}>
                <View style={styles.top}>
                  <Text style={styles.name} numberOfLines={1}>
                    {chat.operator.name}
                  </Text>
                  {chat.lastMessage ? <Text style={styles.time}>{formatRelative(chat.lastMessage.createdAt)}</Text> : null}
                </View>
                <View style={styles.metaRow}>
                  {chat.current ? (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentText}>Joriy dispetcher</Text>
                    </View>
                  ) : null}
                  {chat.operator.companyName ? (
                    <Text style={styles.company} numberOfLines={1}>
                      {chat.operator.companyName}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.top}>
                  <Text style={[styles.preview, chat.unread > 0 && styles.previewUnread]} numberOfLines={1}>
                    {preview}
                  </Text>
                  {chat.unread > 0 ? (
                    <View style={styles.unread}>
                      <Text style={styles.unreadText}>{chat.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowCurrent: { borderColor: colors.borderStrong },
  body: { flex: 1, gap: 3 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  time: { fontSize: 12, color: colors.textTertiary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  currentPill: { backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  currentText: { fontSize: 11, fontWeight: "700", color: colors.success },
  company: { ...type.caption, color: colors.textSecondary, flexShrink: 1 },
  preview: { ...type.caption, color: colors.textTertiary, flex: 1 },
  previewUnread: { color: colors.textPrimary, fontWeight: "600" },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { fontSize: 12, fontWeight: "800", color: colors.bg },
});
