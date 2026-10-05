import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { DriverProfileDto, TruckListingDto } from "@logistics/shared";
import { apiBaseUrl } from "../api";
import { useSession } from "../session";
import { useNav } from "../navigation";
import { colors, radius, spacing, type } from "../theme";
import { formatDate } from "../format";
import { routeText, specsText } from "../truck";
import { formatPhone, phoneDigits } from "../components/PhoneField";
import { Avatar, Button, Card, Chip, IconBadge, InfoRow, Screen, SectionTitle, type IconName } from "../components/ui";

export function ProfileScreen() {
  const { me, trips, loadTrips, signOut, refresh, listing, loadListing } = useSession();
  const nav = useNav();
  const profile = me?.profile;
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (trips === null) void loadTrips();
  }, [trips, loadTrips]);

  useEffect(() => {
    if (listing === undefined) void loadListing();
  }, [listing, loadListing]);

  const stats = useMemo(
    () => ({
      total: trips?.length ?? null,
      completed: trips ? trips.filter((trip) => trip.status === "COMPLETED").length : null,
    }),
    [trips]
  );

  if (!profile) return null;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refresh(), loadTrips(), loadListing()]);
    setRefreshing(false);
  }

  function confirmSignOut() {
    Alert.alert(
      "Chiqish",
      me?.currentTrip
        ? "Joriy reysdan uzilasiz va joylashuv operatorga yuborilmaydi. Qayta kirish uchun operatordan yangi kod kerak bo'ladi."
        : "Qayta kirish uchun operatordan yangi kod kerak bo'ladi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Chiqish",
          style: "destructive",
          onPress: () => {
            setSigningOut(true);
            void signOut();
          },
        },
      ]
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.identity}>
        <Avatar firstName={profile.firstName} lastName={profile.lastName} size={76} />
        <Text style={styles.name}>
          {profile.firstName} {profile.lastName}
        </Text>
        <Text style={styles.phone}>{formatPhone(phoneDigits(profile.phone)).display || profile.phone}</Text>
        <View style={styles.chips}>
          <Chip icon="calendar" label={`${formatDate(profile.createdAt)} dan beri`} />
          <Chip
            icon={profile.registeredVia === "ADMIN" ? "shield" : "smartphone"}
            label={profile.registeredVia === "ADMIN" ? "Admin qo'shgan" : "Ilovada ro'yxatdan o'tgan"}
          />
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Reyslar" value={stats.total} />
        <Stat label="Yakunlangan" value={stats.completed} />
        <Stat label="Hozir" value={me?.currentTrip ? "Reysda" : "Bo'sh"} accent={Boolean(me?.currentTrip)} />
      </View>

      <SectionTitle title="Mening mashinam" action={<EditLink onPress={() => nav.push({ name: "truck" })} />} />
      <TruckCard profile={profile} listing={listing} onTrip={Boolean(me?.currentTrip)} onPress={() => nav.push({ name: "truck" })} />

      <SectionTitle title="Shaxsiy ma'lumotlar" action={<EditLink onPress={() => nav.push({ name: "editProfile" })} />} />
      <Card style={styles.list}>
        <InfoRow label="Ism" value={profile.firstName} />
        <InfoRow label="Familiya" value={profile.lastName} />
        <InfoRow label="Telefon" value={formatPhone(phoneDigits(profile.phone)).display || profile.phone} />
        <InfoRow label="Tug'ilgan sana" value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : null} />
        <InfoRow label="Guvohnoma raqami" value={profile.licenseNumber} last />
      </Card>

      <SectionTitle title="Ilova" />
      <Card style={styles.list}>
        <InfoRow label="Joylashuv yuborish" value="Har 3 soatda" />
        <InfoRow label="Server" value={apiBaseUrl().replace(/^https?:\/\//, "")} last />
      </Card>

      <Button title="Chiqish" icon="log-out" variant="danger" onPress={confirmSignOut} loading={signingOut} />
    </Screen>
  );
}

// The driver's truck at a glance: what it is, where it goes, and whether
// companies can see it and whether it is free right now.
function TruckCard({
  profile,
  listing,
  onTrip,
  onPress,
}: {
  profile: DriverProfileDto;
  listing: TruckListingDto | null | undefined;
  onTrip: boolean;
  onPress: () => void;
}) {
  const hasTruck = Boolean(profile.truckPlate || profile.truckModel || profile.trailerPlate || listing);
  const published = Boolean(listing?.published);
  const specs = specsText(listing);
  const route = routeText(listing);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <Card style={[styles.truckCard, published && styles.truckCardLive]}>
        {hasTruck ? (
          <>
            <View style={styles.truckHead}>
              <IconBadge icon="truck" tone={published ? "success" : "accent"} size={44} />
              <View style={styles.truckTitle}>
                <Text style={styles.truckPlate} numberOfLines={1}>
                  {profile.truckPlate ?? "Raqam kiritilmagan"}
                </Text>
                <Text style={styles.truckSub} numberOfLines={1}>
                  {[profile.truckModel, profile.trailerPlate ? `treyler ${profile.trailerPlate}` : null]
                    .filter(Boolean)
                    .join(" · ") || "Model kiritilmagan"}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textTertiary} />
            </View>
            {specs ? <Text style={styles.truckSpecs}>{specs}</Text> : null}
            {route ? (
              <View style={styles.truckRoute}>
                <Feather name="navigation" size={14} color={colors.accent} />
                <Text style={styles.truckRouteText} numberOfLines={1}>
                  {route}
                </Text>
              </View>
            ) : null}
            <View style={styles.tags}>
              <Tag tone={published ? "success" : "muted"} icon={published ? "eye" : "eye-off"} label={published ? "E'londa" : "E'longa qo'yilmagan"} />
              <Tag tone={onTrip ? "warning" : "success"} icon={onTrip ? "navigation" : "check-circle"} label={onTrip ? "Reysda" : "Bo'sh"} />
            </View>
          </>
        ) : (
          <View style={styles.truckHead}>
            <IconBadge icon="plus" size={44} />
            <View style={styles.truckTitle}>
              <Text style={styles.truckPlate}>Mashinangizni qo'shing</Text>
              <Text style={styles.truckSub}>Raqami, o'lchamlari va yo'nalishi — kompaniyalar sizga yuk taklif qiladi.</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const TAG_TONES = {
  success: { background: colors.successSoft, color: colors.success },
  warning: { background: colors.warningSoft, color: colors.warning },
  muted: { background: colors.surfaceAlt, color: colors.textSecondary },
};

function Tag({ tone, icon, label }: { tone: keyof typeof TAG_TONES; icon: IconName; label: string }) {
  const palette = TAG_TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette.background }]}>
      <Feather name={icon} size={12} color={palette.color} />
      <Text style={[styles.tagText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function EditLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.editLink}>
      <Feather name="edit-2" size={13} color={colors.accent} />
      <Text style={styles.editText}>Tahrirlash</Text>
    </Pressable>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string | null; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: colors.success }]} numberOfLines={1}>
        {value ?? "—"}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: "center", gap: spacing.xs, paddingTop: spacing.md },
  name: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, marginTop: spacing.sm, textAlign: "center" },
  phone: { ...type.body, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  list: { paddingVertical: spacing.xs },
  truckCard: { gap: spacing.md },
  truckCardLive: { borderColor: colors.success },
  truckHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  truckTitle: { flex: 1, gap: 2 },
  truckPlate: { fontSize: 17, fontWeight: "800", color: colors.textPrimary, letterSpacing: 0.3 },
  truckSub: { ...type.caption, color: colors.textSecondary },
  truckSpecs: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  truckRoute: { flexDirection: "row", alignItems: "center", gap: 6 },
  truckRouteText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 12, fontWeight: "700" },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  editText: { fontSize: 13, fontWeight: "700", color: colors.accent },
});
