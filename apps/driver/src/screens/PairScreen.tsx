import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiBaseUrl, pairDriver } from "../api";
import { colors, radius, spacing } from "../theme";

export function PairScreen({ onPaired }: { onPaired: () => Promise<void> }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState<"phone" | "code" | null>(null);

  async function onSubmit() {
    setPending(true);
    setError(null);
    try {
      await pairDriver(phone.trim(), code.trim());
      await onPaired();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pair");
    } finally {
      setPending(false);
    }
  }

  const canSubmit = phone.trim().length > 0 && code.trim().length === 6 && !pending;

  return (
    <LinearGradient colors={[colors.bg, colors.bgElevated]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.wrap}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badge}>
            <MaterialCommunityIcons name="truck-outline" size={30} color={colors.accent} />
          </View>

          <Text style={styles.kicker}>Haydovchi ilovasi</Text>
          <Text style={styles.title}>Telefon va kod</Text>
          <Text style={styles.hint}>
            Operator truck raqami + telefoningizni biriktiradi va 6 xonali kod beradi. Kodni shu yerga kiriting.
          </Text>

          <View style={styles.fieldGroup}>
            <View style={[styles.inputRow, focused === "phone" && styles.inputRowFocused]}>
              <Feather name="phone" size={18} color={focused === "phone" ? colors.accent : colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Telefon raqami"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocused("phone")}
                onBlur={() => setFocused(null)}
                autoComplete="tel"
              />
            </View>

            <View style={[styles.inputRow, focused === "code" && styles.inputRowFocused]}>
              <Feather name="lock" size={18} color={focused === "code" ? colors.accent : colors.textTertiary} />
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="6 xonali kod"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                onFocus={() => setFocused("code")}
                onBlur={() => setFocused(null)}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
            onPress={() => void onSubmit()}
            disabled={!canSubmit}
          >
            {pending ? (
              <Text style={styles.buttonText}>Tekshirilmoqda…</Text>
            ) : (
              <>
                <Text style={styles.buttonText}>Kirish</Text>
                <Feather name="arrow-right" size={18} color={colors.bg} />
              </>
            )}
          </Pressable>

          <Text style={styles.meta}>{apiBaseUrl()}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  wrap: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, paddingBottom: spacing.xxl * 2, gap: spacing.md },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: "800", marginTop: 2 },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: spacing.xs, marginBottom: spacing.sm },
  fieldGroup: { gap: spacing.md },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  inputRowFocused: { borderColor: colors.accent },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 15,
    fontSize: 17,
  },
  codeInput: { letterSpacing: 4, fontVariant: ["tabular-nums"] },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  errorText: { color: colors.danger, fontSize: 13, flexShrink: 1 },
  button: {
    flexDirection: "row",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.textTertiary, fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
