import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { apiBaseUrl } from "../api";
import { useSession } from "../session";
import { useNav } from "../navigation";
import { colors, radius, spacing, type } from "../theme";
import { formatDate } from "../format";
import { formatPhone, phoneDigits } from "../components/PhoneField";
import { Avatar, Button, Card, Chip, InfoRow, Screen, SectionTitle } from "../components/ui";

export function ProfileScreen() {
  const { me, trips, loadTrips, signOut, refresh } = useSession();
  const nav = useNav();
  const profile = me?.profile;
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (trips === null) void loadTrips();
  }, [trips, loadTrips]);

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
    await Promise.all([refresh(), loadTrips()]);
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

      <SectionTitle title="Shaxsiy ma'lumotlar" action={<EditLink onPress={() => nav.push({ name: "editProfile" })} />} />
      <Card style={styles.list}>
        <InfoRow label="Ism" value={profile.firstName} />
        <InfoRow label="Familiya" value={profile.lastName} />
        <InfoRow label="Telefon" value={formatPhone(phoneDigits(profile.phone)).display || profile.phone} />
        <InfoRow label="Tug'ilgan sana" value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : null} />
        <InfoRow label="Guvohnoma raqami" value={profile.licenseNumber} last />
      </Card>

      <SectionTitle title="Transport" action={<EditLink onPress={() => nav.push({ name: "editVehicle" })} />} />
      <Card style={styles.list}>
        <InfoRow label="Mashina raqami" value={profile.truckPlate} />
        <InfoRow label="Mashina modeli" value={profile.truckModel} />
        <InfoRow label="Treyler raqami" value={profile.trailerPlate} />
        <InfoRow label="Treyler turi" value={profile.trailerType} last />
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
  editLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  editText: { fontSize: 13, fontWeight: "700", color: colors.accent },
});
