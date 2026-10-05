import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { DriverProfileDto, TruckListingDto } from "@logistics/shared";
import { api } from "../api";
import { useSession } from "../session";
import { colors, radius, spacing, type } from "../theme";
import { cleanPlate, formatDate } from "../format";
import { Button, Card, Notice, Screen, ScreenHeader, SectionTitle, TextField } from "../components/ui";
import { BODY_TYPES, MAX_VOLUME, bodyTypeFromTrailer, cbmOf } from "../truck";

const AXLES = [2, 3, 4, 5, 6];

// "Mening mashinam": the driver's own truck and its ad are one thing. The
// plates and model are stored on the driver, the specs and the ad on their
// listing; this screen edits and saves them together.
type Form = {
  published: boolean;
  routeFrom: string;
  routeTo: string;
  truckPlate: string;
  truckModel: string;
  trailerPlate: string;
  bodyType: string;
  lengthM: string;
  widthM: string;
  heightM: string;
  volumeM3: string;
  capacityTons: string;
  axles: number | null;
  note: string;
};

type MeasureKey = "lengthM" | "widthM" | "heightM" | "volumeM3" | "capacityTons";

// Volume sits right after the size it is calculated from.
const MEASURES: { key: MeasureKey; label: string }[] = [
  { key: "lengthM", label: "Uzunlik, m" },
  { key: "widthM", label: "Eni, m" },
  { key: "heightM", label: "Balandlik, m" },
  { key: "volumeM3", label: "Hajm, CBM" },
  { key: "capacityTons", label: "Sig'im, t" },
];

const numberText = (value: number | null | undefined) => (value == null ? "" : String(value));

function toForm(profile: DriverProfileDto | null | undefined, listing: TruckListingDto | null): Form {
  return {
    published: listing?.published ?? false,
    routeFrom: listing?.routeFrom ?? "",
    routeTo: listing?.routeTo ?? "",
    truckPlate: profile?.truckPlate ?? "",
    truckModel: profile?.truckModel ?? "",
    trailerPlate: profile?.trailerPlate ?? "",
    bodyType: listing?.bodyType ?? bodyTypeFromTrailer(profile?.trailerType),
    lengthM: numberText(listing?.lengthM),
    widthM: numberText(listing?.widthM),
    heightM: numberText(listing?.heightM),
    volumeM3: numberText(listing?.volumeM3),
    capacityTons: numberText(listing?.capacityTons),
    axles: listing?.axles ?? null,
    note: listing?.note ?? "",
  };
}

// "13,6" and "13.6" both work; an empty field means "not set".
function parseMeasure(value: string): number | null | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function TruckScreen({ onBack }: { onBack: () => void }) {
  const { me, listing, loadListing, setListing, setProfile, handleError } = useSession();
  const profile = me?.profile;
  const [form, setForm] = useState<Form | null>(listing === undefined ? null : toForm(profile, listing));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (listing === undefined) void loadListing().then(setError);
    else if (form === null) setForm(toForm(profile, listing));
  }, [listing, loadListing, form, profile]);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  // Filled in by itself once the length, width and height are all entered.
  const autoVolume = form ? cbmOf(parseMeasure(form.lengthM), parseMeasure(form.widthM), parseMeasure(form.heightM)) : null;

  async function save() {
    if (!form) return;
    const errors: Partial<Record<keyof Form, string>> = {};
    if (form.truckPlate && form.truckPlate.length < 3) errors.truckPlate = "Mashina raqamini to'liq kiriting";
    if (form.trailerPlate && form.trailerPlate.length < 3) errors.trailerPlate = "Treyler raqamini to'liq kiriting";
    const values: Partial<Record<MeasureKey, number | null>> = {};
    for (const { key } of MEASURES) {
      if (key === "volumeM3" && autoVolume != null) continue;
      const parsed = parseMeasure(form[key]);
      if (parsed === undefined) errors[key] = "Raqam kiriting";
      else values[key] = parsed;
    }
    if (autoVolume != null) {
      if (autoVolume > MAX_VOLUME) errors.volumeM3 = `${MAX_VOLUME} CBM dan oshdi — o'lchamlarni tekshiring`;
      else values.volumeM3 = autoVolume;
    }
    if (form.published && !form.bodyType) errors.bodyType = "E'lon uchun kuzov turini tanlang";
    if (form.published && !values.capacityTons) errors.capacityTons = "E'lon uchun sig'imni kiriting";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // The form is long — say so next to the button too.
      setError("Qizil bilan belgilangan maydonlarni to'g'rilang");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveTruck({
        ...values,
        truckPlate: form.truckPlate || null,
        truckModel: form.truckModel.trim() || null,
        trailerPlate: form.trailerPlate || null,
        bodyType: form.bodyType || null,
        axles: form.axles,
        routeFrom: form.routeFrom.trim() || null,
        routeTo: form.routeTo.trim() || null,
        note: form.note.trim() || null,
        published: form.published,
      });
      setProfile(saved.profile);
      setListing(saved.listing);
      // Back to the profile, where the truck card shows what was saved.
      onBack();
    } catch (err) {
      setError(handleError(err));
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader title="Mening mashinam" onBack={onBack} />
        {error ? <Notice message={error} /> : <ActivityIndicator color={colors.accent} style={styles.loader} />}
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader title="Mening mashinam" subtitle="Mashinangiz, o'lchamlari va e'loni — bir joyda." onBack={onBack} />

        <Card style={[styles.publishCard, form.published && styles.publishCardOn]}>
          <View style={styles.publishText}>
            <Text style={styles.publishTitle}>{form.published ? "E'longa qo'yilgan" : "E'longa qo'yilmagan"}</Text>
            <Text style={styles.publishHint}>
              {form.published
                ? listing?.published
                  ? `Kompaniyalar ko'rmoqda · yangilangan ${formatDate(listing.updatedAt)}`
                  : "Saqlaganingizdan so'ng tracking kompaniyalari ko'radi"
                : "Yoqing — tracking kompaniyalari mashinangizni ko'rib, yuk taklif qiladi"}
            </Text>
          </View>
          <Switch
            value={form.published}
            onValueChange={(value) => update("published", value)}
            trackColor={{ false: colors.borderStrong, true: colors.success }}
            thumbColor="#fff"
          />
        </Card>

        <SectionTitle title="Yo'nalish" />
        <View style={styles.route}>
          <View style={styles.routeCell}>
            <TextField
              label="Qayerdan (A)"
              value={form.routeFrom}
              onChangeText={(text) => update("routeFrom", text)}
              placeholder="Toshkent"
              maxLength={80}
            />
          </View>
          <Feather name="arrow-right" size={18} color={colors.textTertiary} style={styles.routeArrow} />
          <View style={styles.routeCell}>
            <TextField
              label="Qayerga (B)"
              value={form.routeTo}
              onChangeText={(text) => update("routeTo", text)}
              placeholder="Moskva"
              maxLength={80}
            />
          </View>
        </View>

        <SectionTitle title="Transport" />
        <TextField
          label="Mashina raqami"
          icon="truck"
          value={form.truckPlate}
          onChangeText={(text) => update("truckPlate", cleanPlate(text))}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="80Z476PA"
          error={fieldErrors.truckPlate}
        />
        <TextField
          label="Mashina modeli"
          icon="tool"
          value={form.truckModel}
          onChangeText={(text) => update("truckModel", text)}
          maxLength={60}
          placeholder="Masalan, Volvo FH 460"
        />
        <TextField
          label="Treyler raqami"
          icon="link"
          value={form.trailerPlate}
          onChangeText={(text) => update("trailerPlate", cleanPlate(text))}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="01A123BC"
          error={fieldErrors.trailerPlate}
        />

        <SectionTitle title="Kuzov turi" />
        <View style={styles.chips}>
          {BODY_TYPES.map((option) => {
            const selected = form.bodyType === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => update("bodyType", selected ? "" : option.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.bodyType ? <Text style={styles.fieldError}>{fieldErrors.bodyType}</Text> : null}

        <SectionTitle title="O'lchamlar va sig'im" />
        <View style={styles.grid}>
          {MEASURES.map(({ key, label }) => {
            const auto = key === "volumeM3" && autoVolume != null;
            return (
              <View key={key} style={styles.gridCell}>
                <TextField
                  label={label}
                  value={auto ? String(autoVolume) : form[key]}
                  onChangeText={(text) => update(key, text.replace(/[^0-9.,]/g, ""))}
                  editable={!auto}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  hint={auto ? "U × E × B" : undefined}
                  error={fieldErrors[key]}
                  style={auto ? styles.autoValue : undefined}
                />
              </View>
            );
          })}
        </View>

        <SectionTitle title="O'qlar soni" />
        <View style={styles.chips}>
          {AXLES.map((count) => {
            const selected = form.axles === count;
            return (
              <Pressable
                key={count}
                onPress={() => update("axles", selected ? null : count)}
                style={[styles.chip, styles.axleChip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{count}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label="Izoh"
          value={form.note}
          onChangeText={(text) => update("note", text)}
          placeholder="Qo'shimcha ma'lumot: bo'sh sanalar, shartlar…"
          multiline
          maxLength={500}
          style={styles.note}
        />

        {error ? <Notice message={error} /> : null}
        <Button title={form.published ? "Saqlash va e'lon qilish" : "Saqlash"} icon="check" onPress={save} loading={saving} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  loader: { marginTop: spacing.xxl },
  publishCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  publishCardOn: { borderColor: colors.success },
  publishText: { flex: 1, gap: 2 },
  publishTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  publishHint: { ...type.caption, color: colors.textSecondary },
  route: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  routeCell: { flex: 1 },
  // Centred on the input row (~50 high), not on the label above it.
  routeArrow: { marginBottom: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  axleChip: { minWidth: 48, alignItems: "center" },
  chipSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { ...type.caption, color: colors.textSecondary, fontWeight: "600" },
  chipTextSelected: { color: colors.accent },
  fieldError: { ...type.caption, color: colors.danger },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md, rowGap: spacing.md },
  gridCell: { flexBasis: "30%", flexGrow: 1 },
  autoValue: { color: colors.accent, fontWeight: "700" },
  note: { minHeight: 80, textAlignVertical: "top" },
});
