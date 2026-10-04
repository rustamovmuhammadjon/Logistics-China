import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../theme";

export function CodeInput({
  value,
  onChange,
  length = 6,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length }, (_, i) => value[i] ?? "");
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.row}>
      {cells.map((char, i) => {
        const isActive = focused && i === activeIndex;
        return (
          <View key={i} style={[styles.cell, !!char && styles.cellFilled, isActive && styles.cellActive]}>
            {char ? <Text style={styles.cellText}>{char}</Text> : isActive ? <View style={styles.caret} /> : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) =>
          onChange(
            t
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, length)
          )
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="default"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={length}
        autoFocus={autoFocus}
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  cell: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cellFilled: { backgroundColor: colors.surface, borderColor: colors.border },
  cellActive: { borderColor: colors.accent },
  cellText: { color: colors.textPrimary, fontSize: 22, fontWeight: "700" },
  caret: { width: 2, height: 22, backgroundColor: colors.accent, borderRadius: 1 },
  hiddenInput: { position: "absolute", width: "100%", height: "100%", opacity: 0 },
});
