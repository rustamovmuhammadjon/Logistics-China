import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";
import type { IconName } from "./ui";

export type Tab = "home" | "trips" | "profile";

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "home", label: "Asosiy", icon: "home" },
  { key: "trips", label: "Reyslar", icon: "list" },
  { key: "profile", label: "Profil", icon: "user" },
];

export const TAB_BAR_HEIGHT = 64;

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TABS.map((item) => {
        const active = item.key === tab;
        const color = active ? colors.accent : colors.textTertiary;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.indicator, active && styles.indicatorActive]} />
            <Feather name={item.icon} size={22} color={color} />
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
});
