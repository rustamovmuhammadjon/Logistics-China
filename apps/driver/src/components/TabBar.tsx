import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";
import type { IconName } from "./ui";

export type Tab = "home" | "trips" | "chat" | "profile";

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "home", label: "Asosiy", icon: "home" },
  { key: "trips", label: "Reyslar", icon: "list" },
  { key: "chat", label: "Chat", icon: "message-circle" },
  { key: "profile", label: "Profil", icon: "user" },
];

export const TAB_BAR_HEIGHT = 64;

export function TabBar({
  tab,
  onChange,
  badges,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  badges?: Partial<Record<Tab, number>>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TABS.map((item) => {
        const active = item.key === tab;
        const color = active ? colors.accent : colors.textTertiary;
        const badge = badges?.[item.key] ?? 0;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={badge > 0 ? `${item.label}, ${badge} yangi` : item.label}
          >
            <View style={[styles.indicator, active && styles.indicatorActive]} />
            <View>
              <Feather name={item.icon} size={22} color={color} />
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  item: { flex: 1, alignItems: "center", gap: 3, paddingTop: 2, height: TAB_BAR_HEIGHT - 8 },
  indicator: { width: 28, height: 3, borderRadius: 2, marginBottom: 6, backgroundColor: "transparent" },
  indicatorActive: { backgroundColor: colors.accent },
  label: { fontSize: 11, fontWeight: "600" },
  badge: {
    position: "absolute",
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
