import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AsYouType, isValidPhoneNumber } from "libphonenumber-js";
import { colors, radius, spacing, type } from "../theme";

// Regional-indicator flag emoji from the ISO code libphonenumber-js
// detects ("UZ" -> 🇺🇿) — no flag assets needed.
function flagEmoji(country?: string) {
  if (!country || country.length !== 2) return null;
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export function formatPhone(digits: string) {
  if (!digits) return { display: "", country: undefined as string | undefined };
  const formatter = new AsYouType();
  const display = formatter.input(`+${digits}`);
  return { display, country: formatter.getNumber()?.country as string | undefined };
}

export function phoneDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function isPhoneValid(digits: string) {
  return digits.length > 0 && isValidPhoneNumber(`+${digits}`);
}

// The "+" is always there and the country is worked out from what's typed,
// so a driver only ever types digits.
export function PhoneField({
  label,
  digits,
  onChangeDigits,
  error,
}: {
  label: string;
  digits: string;
  onChangeDigits: (digits: string) => void;
  error?: string | null;
}) {
  const [focused, setFocused] = useState(false);
  const { display, country } = useMemo(() => formatPhone(digits), [digits]);
  const flag = flagEmoji(country);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, focused && styles.rowFocused, error ? styles.rowError : null]}>
        <Text style={styles.flag}>{flag ?? "🌐"}</Text>
        <TextInput
          style={styles.input}
          placeholder="+998 90 123 45 67"
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          textContentType="telephoneNumber"
          autoComplete="tel"
          value={display}
          onChangeText={(text) => onChangeDigits(phoneDigits(text).slice(0, 15))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { ...type.label, color: colors.textTertiary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  rowFocused: { borderColor: colors.accent },
  rowError: { borderColor: colors.danger },
  flag: { fontSize: 20 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 16, paddingVertical: 14, letterSpacing: 0.3 },
  error: { ...type.caption, color: colors.danger },
});
