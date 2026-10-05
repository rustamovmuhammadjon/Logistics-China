import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { TruckListingDto } from "@logistics/shared";
import { api } from "../api";
import { useSession } from "../session";
import { useNav } from "../navigation";
import { colors, radius, spacing, type } from "../theme";
import { formatDate } from "../format";
import { Button, Card, Notice, Screen, ScreenHeader, SectionTitle, TextField } from "../components/ui";

// Stored in English (what the tracking companies' website shows), offered
// to the driver in Uzbek.
export const BODY_TYPES: { value: string; label: string }[] = [
  { value: "Tent", label: "Tent" },
  { value: "Refrigerated", label: "Refrijerator" },
  { value: "Isothermal", label: "Izoterm" },
  { value: "Flatbed", label: "Bortli" },
  { value: "Container", label: "Konteyner" },
  { value: "Tipper", label: "Samosval" },
  { value: "Car carrier", label: "Avtovoz" },
];

const AXLES = [2, 3, 4, 5, 6];

export function bodyTypeLabel(value: string | null | undefined) {
  return BODY_TYPES.find((t) => t.value === value)?.label ?? value ?? null;
}

type Form = {
  bodyType: string;
  lengthM: string;
  widthM: string;
  heightM: string;
  capacityTons: string;
  volumeM3: string;
  axles: number | null;
  baseCity: string;
  note: string;
  published: boolean;
};

const numberText = (value: number | null) => (value == null ? "" : String(value));

function toForm(listing: TruckListingDto | null): Form {
  return {
    bodyType: listing?.bodyType ?? "",
    lengthM: numberText(listing?.lengthM ?? null),
    widthM: numberText(listing?.widthM ?? null),
    heightM: numberText(listing?.heightM ?? null),
    capacityTons: numberText(listing?.capacityTons ?? null),
    volumeM3: numberText(listing?.volumeM3 ?? null),
    axles: listing?.axles ?? null,
    baseCity: listing?.baseCity ?? "",
    note: listing?.note ?? "",
    published: listing?.published ?? false,
  };
}

// "13,6" and "13.6" both work; an empty field means "not set".
function parseMeasure(value: string): number | null | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

// Volume sits right after the size it is calculated from.
const MEASURES: { key: "lengthM" | "widthM" | "heightM" | "volumeM3" | "capacityTons"; label: string }[] = [
  { key: "lengthM", label: "Uzunlik, m" },
  { key: "widthM", label: "Eni, m" },
  { key: "heightM", label: "Balandlik, m" },
  { key: "volumeM3", label: "Hajm, CBM" },
  { key: "capacityTons", label: "Sig'im, t" },
];

const MAX_VOLUME = 200;

// Same as cbmOf in @logistics/shared (the app only takes types from there):
// length × width × height in metres → cubic metres, 2 decimals.
function cbmOf(lengthM: number | null | undefined, widthM: number | null | undefined, heightM: number | null | undefined) {
  if (!lengthM || !widthM || !heightM) return null;
  return Math.round(lengthM * widthM * heightM * 100) / 100;
}

export function ListingScreen({ onBack }: { onBack: () => void }) {
  const { me, listing, loadListing, setListing, handleError } = useSession();
  const nav = useNav();
  const profile = me?.profile;
  const [form, setForm] = useState<Form | null>(listing === undefined ? null : toForm(listing));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (listing === undefined) void loadListing().then(setError);
    else if (form === null) setForm(toForm(listing));
  }, [listing, loadListing, form]);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  // Filled in by itself once the length, width and height are all entered.
  const autoVolume = form
    ? cbmOf(parseMeasure(form.lengthM), parseMeasure(form.widthM), parseMeasure(form.heightM))
    : null;

  async function save() {
    if (!form) return;
    const errors: Partial<Record<keyof Form, string>> = {};
    const values: Partial<Record<(typeof MEASURES)[number]["key"], number | null>> = {};
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
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const { listing: next } = await api.saveListing({
        ...values,
        bodyType: form.bodyType.trim() || null,
        axles: form.axles,
        baseCity: form.baseCity.trim() || null,
        note: form.note.trim() || null,
        published: form.published,
      });
      setListing(next);
      setForm(toForm(next));
      setSaved(true);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader title="Mashina e'loni" onBack={onBack} />
        {error ? <Notice message={error} /> : <ActivityIndicator color={colors.accent} style={styles.loader} />}
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader
          title="Mashina e'loni"
          subtitle="Tracking kompaniyalari e'loningizni ko'radi va yuk bilan siz bilan bog'lanadi."
          onBack={onBack}
        />

        <Card style={[styles.publishCard, form.published && styles.publishCardOn]}>
          <View style={styles.publishText}>
            <Text style={styles.publishTitle}>{form.published ? "E'lon ko'rinadi" : "E'lon yashirin"}</Text>
            <Text style={styles.publishHint}>
              {form.published
                ? listing?.published
                  ? `Kompaniyalar ko'rmoqda · yangilangan ${formatDate(listing.updatedAt)}`
                  : "Saqlaganingizdan so'ng kompaniyalar ko'radi"
                : "Faqat siz ko'rasiz. Yoqing va saqlang."}
            </Text>
          </View>
          <Switch
            value={form.published}
            onValueChange={(value) => update("published", value)}
            trackColor={{ false: colors.borderStrong, true: colors.success }}
            thumbColor="#fff"
          />
        </Card>

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
          label="Asosiy shahar"
          icon="map-pin"
          value={form.baseCity}
          onChangeText={(text) => update("baseCity", text)}
          placeholder="Masalan, Toshkent"
          maxLength={80}
        />
        <TextField
          label="Izoh"
          value={form.note}
          onChangeText={(text) => update("note", text)}
          placeholder="Qo'shimcha ma'lumot: yo'nalishlar, bo'sh sanalar…"
          multiline
          maxLength={500}
          style={styles.note}
        />

        <SectionTitle
          title="Transport"
          action={
            <Pressable onPress={() => nav.push({ name: "editVehicle" })} hitSlop={10}>
              <Text style={styles.link}>O'zgartirish</Text>
            </Pressable>
          }
        />
        <Card style={styles.vehicle}>
          <Text style={styles.vehicleText}>
            {[profile?.truckPlate, profile?.truckModel].filter(Boolean).join(" · ") || "Mashina kiritilmagan"}
          </Text>
          <Text style={styles.vehicleSub}>
            {[profile?.trailerPlate, profile?.trailerType].filter(Boolean).join(" · ") || "Treyler kiritilmagan"}
          </Text>
        </Card>

        {error ? <Notice message={error} /> : null}
        {saved ? <Notice tone="success" message={form.published ? "E'lon saqlandi va kompaniyalarga ko'rinadi" : "Saqlandi"} /> : null}
        <Button title="Saqlash" icon="check" onPress={save} loading={saving} />
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
  link: { fontSize: 13, fontWeight: "700", color: colors.accent },
  vehicle: { gap: 4 },
  vehicleText: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  vehicleSub: { ...type.caption, color: colors.textSecondary },
});
