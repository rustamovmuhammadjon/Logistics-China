import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api, apiBaseUrl } from "../api";
import { errorMessage } from "../i18n";
import { useSession } from "../session";
import { colors, radius, spacing, type } from "../theme";
import { CodeInput } from "../components/CodeInput";
import { QrScanner } from "../components/QrScanner";
import { Button, Notice, Screen, ScreenHeader } from "../components/ui";

const CODE_LENGTH = 8;

const cleanCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);

// Two uses: the first sign-in, and — with onBack — a registered driver
// attaching their next trip without signing out.
export function PairScreen({ onBack }: { onBack?: () => void }) {
  const { applyAuth, notice } = useSession();
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const attaching = Boolean(onBack);

  async function submit(fullCode: string) {
    setPending(true);
    setError(null);
    try {
      await applyAuth(await api.pair(fullCode));
      onBack?.();
    } catch (err) {
      // Not routed through the session: a wrong code must never sign a
      // registered driver out.
      setError(errorMessage(err));
      setCode("");
    } finally {
      setPending(false);
    }
  }

  function onCodeChange(next: string) {
    setCode(next);
    if (next.length === CODE_LENGTH && !pending) void submit(next);
  }

  if (scanning) {
    return (
      <QrScanner
        onClose={() => setScanning(false)}
        onScanned={(data) => {
          const scanned = cleanCode(data);
          setScanning(false);
          setCode(scanned);
          if (scanned.length === CODE_LENGTH) void submit(scanned);
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]} contentStyle={!attaching && styles.centered}>
        {attaching ? (
          <ScreenHeader title="Yangi reysga ulanish" onBack={onBack} />
        ) : (
          <View style={styles.hero}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="truck-outline" size={30} color={colors.accent} />
            </View>
            <Text style={styles.kicker}>Haydovchi ilovasi</Text>
            <Text style={styles.title}>Kodni kiriting</Text>
          </View>
        )}

        <Text style={styles.hint}>
          {attaching
            ? "Operator bergan yangi 8 xonali kodni kiriting — reys profilingizga qo'shiladi."
            : "Operator bergan 8 xonali kodni kiriting yoki QR kodni skanerlang."}
        </Text>

        {notice && !attaching ? <Notice tone="warning" message={notice} /> : null}

        <View style={styles.codeWrap}>
          <CodeInput value={code} onChange={onCodeChange} length={CODE_LENGTH} autoFocus />
        </View>

        {pending ? <Text style={styles.pending}>Tekshirilmoqda…</Text> : null}
        {error && !pending ? <Notice message={error} /> : null}

        <Button title="QR kodni skanerlash" icon="camera" variant="secondary" onPress={() => setScanning(true)} />

        {!attaching ? <Text style={styles.meta}>{apiBaseUrl()}</Text> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  centered: { flexGrow: 1, justifyContent: "center", paddingBottom: spacing.xxl * 2 },
  hero: { gap: spacing.xs },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  kicker: { ...type.kicker, color: colors.accent },
  title: { ...type.title, color: colors.textPrimary, fontSize: 30 },
  hint: { ...type.body, color: colors.textSecondary },
  codeWrap: { marginVertical: spacing.xs },
  pending: { ...type.caption, color: colors.textSecondary, textAlign: "center" },
  meta: { ...type.caption, color: colors.textTertiary, textAlign: "center", marginTop: spacing.sm, fontSize: 12 },
});
