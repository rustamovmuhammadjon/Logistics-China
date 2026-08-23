import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiBaseUrl, pairDriver } from "../api";

export function PairScreen({ onPaired }: { onPaired: () => Promise<void> }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.kicker}>Haydovchi ilovasi</Text>
      <Text style={styles.title}>Telefon va kod</Text>
      <Text style={styles.hint}>
        Operator truck raqami + telefoningizni biriktiradi va 6 xonali kod beradi. Kodni shu yerga kiriting.
      </Text>
      <Text style={styles.meta}>Server: {apiBaseUrl()}</Text>
      <TextInput
        style={styles.input}
        placeholder="Telefon raqami"
        placeholderTextColor="#64748b"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        autoComplete="tel"
      />
      <TextInput
        style={styles.input}
        placeholder="6 xonali kod"
        placeholderTextColor="#64748b"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={() => void onSubmit()} disabled={pending}>
        <Text style={styles.buttonText}>{pending ? "Tekshirilmoqda…" : "Kirish"}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  kicker: { color: "#7dd3fc", fontSize: 13, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: "white", fontSize: 28, fontWeight: "800" },
  hint: { color: "#94a3b8", fontSize: 14, lineHeight: 20, marginBottom: 8 },
  meta: { color: "#475569", fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    color: "white",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
  },
  error: { color: "#fca5a5" },
  button: { backgroundColor: "#0284c7", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
});
