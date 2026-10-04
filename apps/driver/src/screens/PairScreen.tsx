import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiBaseUrl, pairDriver } from "../api";
import { colors, radius, spacing } from "../theme";
import { CodeInput } from "../components/CodeInput";
import { QrScanner } from "../components/QrScanner";

const CODE_LENGTH = 8;

export function PairScreen({ onPaired }: { onPaired: () => Promise<void> }) {
  const [mode, setMode] = useState<"code" | "scan">("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submitCode(fullCode: string) {
    setPending(true);
    setError(null);
    try {
      await pairDriver(fullCode);
      await onPaired();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kodni tasdiqlab bo'lmadi");
      setCode("");
      setMode("code");
    } finally {
      setPending(false);
    }
  }

  function onCodeChange(next: string) {
    setCode(next);
    if (next.length === CODE_LENGTH && !pending) void submitCode(next);
  }

  function onScanned(data: string) {
    const cleaned = data
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH);
    setMode("code");
    setCode(cleaned);
    if (cleaned.length === CODE_LENGTH) void submitCode(cleaned);
  }

  if (mode === "scan") {
    return <QrScanner onScanned={onScanned} onClose={() => setMode("code")} />;
  }

  return (
    <LinearGradient colors={[colors.bg, colors.bgElevated]} style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.wrap}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badge}>
            <MaterialCommunityIcons name="truck-outline" size={30} color={colors.accent} />
          </View>

          <Text style={styles.kicker}>Haydovchi ilovasi</Text>
          <Text style={styles.title}>Kodni kiriting</Text>
          <Text style={styles.hint}>Operator bergan 8 xonali kodni kiriting yoki QR kodni skanerlang.</Text>

          <View style={styles.codeWrap}>
            <CodeInput value={code} onChange={onCodeChange} length={CODE_LENGTH} autoFocus />
          </View>

          {pending ? (
            <Text style={styles.pendingText}>Tekshirilmoqda…</Text>
          ) : error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => setMode("scan")}
          >
            <Feather name="camera" size={18} color={colors.bg} />
            <Text style={styles.buttonText}>QR kodni skanerlash</Text>
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
  codeWrap: { marginTop: spacing.sm, marginBottom: spacing.xs },
  pendingText: { color: colors.textSecondary, fontSize: 13, textAlign: "center" },
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
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.textTertiary, fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
