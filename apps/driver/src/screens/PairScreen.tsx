import { useMemo, useState } from "react";
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
import { AsYouType, isValidPhoneNumber } from "libphonenumber-js";
import { apiBaseUrl, pairDriver } from "../api";
import { colors, radius, spacing } from "../theme";
import { CodeInput } from "../components/CodeInput";

// Regional-indicator flag emoji built from the 2-letter ISO code
// libphonenumber-js detects (e.g. "UZ" -> 🇺🇿) — no extra asset needed.
function flagEmoji(countryCode?: string) {
  if (!countryCode || countryCode.length !== 2) return null;
  const points = [...countryCode.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...points);
}

function formatPhone(digits: string) {
  if (!digits) return { display: "", country: undefined as string | undefined };
  const formatter = new AsYouType();
  const display = formatter.input(`+${digits}`);
  return { display, country: formatter.getNumber()?.country as string | undefined };
}

export function PairScreen({ onPaired }: { onPaired: () => Promise<void> }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const { display: phoneDisplay, country } = useMemo(() => formatPhone(phoneDigits), [phoneDigits]);
  const flag = flagEmoji(country);
  const phoneValid = phoneDigits.length > 0 && isValidPhoneNumber(`+${phoneDigits}`);

  async function submitCode(fullCode: string) {
    setPending(true);
    setError(null);
    try {
      await pairDriver(`+${phoneDigits}`, fullCode);
      await onPaired();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pair");
      setCode("");
    } finally {
      setPending(false);
    }
  }

  function onCodeChange(next: string) {
    setCode(next);
    if (next.length === 6 && !pending) void submitCode(next);
  }

  function goToCode() {
    setError(null);
    setStep("code");
  }

  function backToPhone() {
    setError(null);
    setCode("");
    setStep("phone");
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

          {step === "phone" ? (
            <>
              <Text style={styles.title}>Telefon raqami</Text>
              <Text style={styles.hint}>
                Operator truck raqami + telefoningizni biriktiradi. Avval raqamingizni kiriting.
              </Text>

              <View style={[styles.inputRow, phoneFocused && styles.inputRowFocused]}>
                <Text style={styles.flag}>{flag ?? "🌐"}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+998 90 123 45 67"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  value={phoneDisplay}
                  onChangeText={(t) => setPhoneDigits(t.replace(/\D/g, ""))}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  autoFocus
                />
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
                  !phoneValid && styles.buttonDisabled,
                  pressed && phoneValid && styles.buttonPressed,
                ]}
                onPress={goToCode}
                disabled={!phoneValid}
              >
                <Text style={styles.buttonText}>Davom etish</Text>
                <Feather name="arrow-right" size={18} color={colors.bg} />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Kodni kiriting</Text>
              <Text style={styles.hint}>
                <Text style={styles.hintStrong}>
                  {flag} {phoneDisplay}
                </Text>{" "}
                raqamiga operator bergan 6 xonali kodni kiriting.
              </Text>

              <View style={styles.codeWrap}>
                <CodeInput value={code} onChange={onCodeChange} autoFocus />
              </View>

              {pending ? (
                <Text style={styles.pendingText}>Tekshirilmoqda…</Text>
              ) : error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]} onPress={backToPhone}>
                <Feather name="arrow-left" size={15} color={colors.textTertiary} />
                <Text style={styles.linkText}>Raqamni o'zgartirish</Text>
              </Pressable>
            </>
          )}

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
  hintStrong: { color: colors.textPrimary, fontWeight: "700" },
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
  flag: { fontSize: 20 },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 15,
    fontSize: 17,
  },
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
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: "700" },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  linkText: { color: colors.textTertiary, fontSize: 14 },
  meta: { color: colors.textTertiary, fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
