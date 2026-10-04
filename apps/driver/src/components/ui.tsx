import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import type { DriverTripStatus } from "@logistics/shared";
import { colors, radius, spacing, type } from "../theme";
import { TRIP_STATUS, initials } from "../format";

export type IconName = ComponentProps<typeof Feather>["name"];

export function Screen({
  children,
  edges = ["top"],
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  bottomInset = 0,
}: {
  children: ReactNode;
  edges?: Edge[];
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  // Room to leave under the content, e.g. for the tab bar.
  bottomInset?: number;
}) {
  return (
    <LinearGradient colors={[colors.bg, colors.bgElevated]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={edges}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.screenContent, { paddingBottom: spacing.xl + bottomInset }, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={Boolean(refreshing)}
                  onRefresh={onRefresh}
                  tintColor={colors.accent}
                  colors={[colors.accent]}
                  progressBackgroundColor={colors.surface}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, styles.screenContent, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  kicker,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string | null;
  kicker?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
      ) : null}
      <View style={styles.headerText}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={[styles.title, onBack && styles.titleCompact]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = BUTTON_PALETTE[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: palette.border },
        disabled && !loading && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={18} color={palette.text} /> : null}
          <Text style={[styles.buttonText, { color: palette.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const BUTTON_PALETTE: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: colors.accent, border: colors.accent, text: colors.bg },
  secondary: { background: colors.surfaceAlt, border: colors.border, text: colors.textPrimary },
  danger: { background: colors.dangerSoft, border: "transparent", text: colors.danger },
  ghost: { background: "transparent", border: "transparent", text: colors.textSecondary },
};

export function TextField({
  label,
  icon,
  error,
  hint,
  style,
  ...inputProps
}: TextInputProps & { label: string; icon?: IconName; error?: string | null; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused, error ? styles.inputRowError : null]}>
        {icon ? <Feather name={icon} size={17} color={focused ? colors.accent : colors.textTertiary} /> : null}
        <TextInput
          placeholderTextColor={colors.textTertiary}
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function StatusPill({ status }: { status: DriverTripStatus }) {
  const meta = TRIP_STATUS[status];
  return (
    <View style={[styles.pill, { backgroundColor: meta.background }]}>
      <View style={[styles.pillDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export function Chip({ label, icon }: { label: string; icon?: IconName }) {
  return (
    <View style={styles.chip}>
      {icon ? <Feather name={icon} size={13} color={colors.textSecondary} /> : null}
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function InfoRow({ label, value, last }: { label: string; value: string | null | undefined; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, !value && styles.infoValueEmpty]} numberOfLines={2}>
        {value || "Kiritilmagan"}
      </Text>
    </View>
  );
}

export function Avatar({ firstName, lastName, size = 48 }: { firstName?: string | null; lastName?: string | null; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials(firstName, lastName)}</Text>
    </View>
  );
}

export function IconBadge({ icon, tone = "accent", size = 40 }: { icon: IconName; tone?: "accent" | "success" | "warning"; size?: number }) {
  const palette = {
    accent: [colors.accentSoft, colors.accent],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
  }[tone];
  return (
    <View style={[styles.iconBadge, { width: size, height: size, backgroundColor: palette[0] }]}>
      <Feather name={icon} size={size * 0.45} color={palette[1]} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <Card style={styles.empty}>
      <IconBadge icon={icon} size={56} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </Card>
  );
}

const NOTICE_TONES = {
  danger: { background: colors.dangerSoft, color: colors.danger, icon: "alert-circle" },
  warning: { background: colors.warningSoft, color: colors.warning, icon: "alert-triangle" },
  success: { background: colors.successSoft, color: colors.success, icon: "check-circle" },
} as const;

export function Notice({
  tone = "danger",
  message,
  actionLabel,
  onAction,
}: {
  tone?: keyof typeof NOTICE_TONES;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const meta = NOTICE_TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: meta.background }]}>
      <Feather name={meta.icon} size={16} color={meta.color} />
      <Text style={[styles.noticeText, { color: meta.color }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.noticeAction, { color: meta.color }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screenContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },

  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xs },
  headerText: { flex: 1, gap: 2 },
  kicker: { ...type.kicker, color: colors.accent },
  title: { ...type.title, color: colors.textPrimary },
  titleCompact: { fontSize: 22 },
  subtitle: { ...type.caption, color: colors.textSecondary },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  sectionTitle: { ...type.label, color: colors.textTertiary },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  buttonText: { fontSize: 16, fontWeight: "700" },

  field: { gap: 6 },
  fieldLabel: { ...type.label, color: colors.textTertiary },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  inputRowFocused: { borderColor: colors.accent },
  inputRowError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.textPrimary, fontSize: 16, paddingVertical: 14 },
  fieldError: { ...type.caption, color: colors.danger },
  fieldHint: { ...type.caption, color: colors.textTertiary },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: "700" },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.lg, paddingVertical: spacing.md },
  infoRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  infoLabel: { ...type.caption, color: colors.textSecondary },
  infoValue: { ...type.caption, color: colors.textPrimary, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  infoValueEmpty: { color: colors.textTertiary, fontWeight: "400" },

  avatar: { backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontWeight: "800" },
  iconBadge: { borderRadius: radius.md, alignItems: "center", justifyContent: "center" },

  empty: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...type.heading, color: colors.textPrimary, marginTop: spacing.sm, textAlign: "center" },
  emptyText: { ...type.caption, color: colors.textSecondary, textAlign: "center", maxWidth: 280 },
  emptyAction: { alignSelf: "stretch", marginTop: spacing.md },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  noticeText: { ...type.caption, flex: 1 },
  noticeAction: { ...type.caption, fontWeight: "700", textDecorationLine: "underline" },
});
