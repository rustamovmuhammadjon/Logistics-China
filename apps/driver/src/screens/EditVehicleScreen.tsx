import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useSession } from "../session";
import { colors, radius, spacing, type } from "../theme";
import { cleanPlate } from "../format";
import { Button, Notice, Screen, ScreenHeader, TextField } from "../components/ui";

const TRAILER_TYPES = ["Tent", "Refrijerator", "Izoterm", "Ochiq platforma", "Konteyner"];

type FieldErrors = Partial<Record<"truckPlate" | "trailerPlate", string>>;

export function EditVehicleScreen({ onBack }: { onBack: () => void }) {
  const { me, setProfile, handleError } = useSession();
  const profile = me?.profile;
  const [truckPlate, setTruckPlate] = useState(profile?.truckPlate ?? "");
  const [truckModel, setTruckModel] = useState(profile?.truckModel ?? "");
  const [trailerPlate, setTrailerPlate] = useState(profile?.trailerPlate ?? "");
  const [trailerType, setTrailerType] = useState(profile?.trailerType ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const errors: FieldErrors = {};
    if (truckPlate && truckPlate.length < 3) errors.truckPlate = "Mashina raqamini to'liq kiriting";
    if (trailerPlate && trailerPlate.length < 3) errors.trailerPlate = "Treyler raqamini to'liq kiriting";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const { profile: updated } = await api.updateProfile({
        truckPlate: truckPlate || null,
        truckModel: truckModel.trim() || null,
        trailerPlate: trailerPlate || null,
        trailerType: trailerType.trim() || null,
      });
      setProfile(updated);
      onBack();
    } catch (err) {
      setError(handleError(err));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader
          title="Transport"
          subtitle="O'zingizning mashina va treyleringiz. Operator reys uchun biriktirgan mashina alohida ko'rsatiladi."
          onBack={onBack}
        />
        <TextField
          label="Mashina raqami"
          icon="truck"
          value={truckPlate}
          onChangeText={(text) => setTruckPlate(cleanPlate(text))}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="80Z476PA"
          error={fieldErrors.truckPlate}
        />
        <TextField
          label="Mashina modeli"
          icon="tool"
          value={truckModel}
          onChangeText={setTruckModel}
          maxLength={60}
          placeholder="Masalan, Volvo FH 460"
        />
        <TextField
          label="Treyler raqami"
          icon="link"
          value={trailerPlate}
          onChangeText={(text) => setTrailerPlate(cleanPlate(text))}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="01A123BC"
          error={fieldErrors.trailerPlate}
        />
        <View style={styles.typeBlock}>
          <TextField
            label="Treyler turi"
            icon="box"
            value={trailerType}
            onChangeText={setTrailerType}
            maxLength={60}
            placeholder="Tanlang yoki yozing"
          />
          <View style={styles.options}>
            {TRAILER_TYPES.map((option) => {
              const selected = trailerType.trim().toLowerCase() === option.toLowerCase();
              return (
                <Pressable
                  key={option}
                  onPress={() => setTrailerType(selected ? "" : option)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {error ? <Notice message={error} /> : null}
        <Button title="Saqlash" icon="check" onPress={save} loading={saving} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  typeBlock: { gap: spacing.md },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionText: { ...type.caption, color: colors.textSecondary, fontWeight: "600" },
  optionTextSelected: { color: colors.accent },
});
