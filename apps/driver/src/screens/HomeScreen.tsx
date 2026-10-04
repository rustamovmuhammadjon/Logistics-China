import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { DriverTripDto } from "@logistics/shared";
import { useSession } from "../session";
import { useNav } from "../navigation";
import { ensureForegroundPermission, sendCurrentLocation } from "../location";
import { colors, radius, spacing, type } from "../theme";
import {
  formatDate,
  formatRelative,
  formatToday,
  formatWeight,
  greeting,
  isPingFresh,
  splitLocationLabel,
} from "../format";
import { Avatar, Button, Card, Chip, EmptyState, IconBadge, Notice, Screen, StatusPill } from "../components/ui";
import { MiniStat, RouteView, tripTitle } from "../components/trip";

type Feedback = { tone: "success" | "danger"; message: string } | null;

export function HomeScreen() {
  const { me, refresh, patchCurrentTrip, handleError, locationIssue, retryLocation } = useSession();
  const nav = useNav();
  const profile = me?.profile;
  const trip = me?.currentTrip ?? null;
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (feedback?.tone !== "success") return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function onRefresh() {
    setRefreshing(true);
    const error = await refresh();
    setRefreshing(false);
    setFeedback(error ? { tone: "danger", message: error } : null);
  }

  async function sendNow() {
    setSending(true);
    setFeedback(null);
    try {
      await ensureForegroundPermission();
      const result = await sendCurrentLocation();
      if (result) patchCurrentTrip({ lastPingAt: result.lastPingAt, lastLocationText: result.lastLocationText });
      setFeedback({ tone: "success", message: "Joylashuv operatorga yuborildi" });
    } catch (err) {
      setFeedback({ tone: "danger", message: handleError(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.date}>{formatToday()}</Text>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting()}, {profile?.firstName ?? "haydovchi"}
          </Text>
        </View>
        <Pressable onPress={() => nav.setTab("profile")} hitSlop={8}>
          <Avatar firstName={profile?.firstName} lastName={profile?.lastName} size={46} />
        </Pressable>
      </View>

      {locationIssue ? (
        <Notice tone="warning" message={locationIssue} actionLabel="Ruxsat berish" onAction={() => void retryLocation()} />
      ) : null}

      {trip ? (
        <>
          <TripHero trip={trip} onOpen={() => nav.push({ name: "trip", tripId: trip.id })} />
          <LocationCard trip={trip} sending={sending} onSend={() => void sendNow()} />
        </>
      ) : (
        <EmptyState
          icon="truck"
          title="Hozir faol reys yo'q"
          text="Yangi reysga ulanish uchun operator bergan kodni kiriting. Profilingiz va reyslar tarixi saqlanib qoladi."
          action={<Button title="Kodni kiritish" icon="key" onPress={() => nav.push({ name: "attachTrip" })} />}
        />
      )}

      {feedback ? <Notice tone={feedback.tone} message={feedback.message} /> : null}
    </Screen>
  );
}

function TripHero({ trip, onOpen }: { trip: DriverTripDto; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.kicker}>Joriy reys</Text>
          <StatusPill status={trip.status} />
        </View>

        <Text style={styles.plate}>{trip.truck.plateNumber || "Mashina"}</Text>
        <View style={styles.chips}>
          <Chip icon="file-text" label={tripTitle(trip)} />
          {trip.truck.trailerPlateNumber ? <Chip icon="link" label={`Treyler ${trip.truck.trailerPlateNumber}`} /> : null}
        </View>

        <View style={styles.divider} />
        <RouteView origin={trip.order.origin} destination={trip.order.destination} />
        <View style={styles.divider} />

        <View style={styles.stats}>
          <MiniStat label="Yuk" value={trip.order.commodity ?? trip.truck.cargoDescription} />
          <MiniStat label="Og'irlik" value={formatWeight(trip.truck.cargoWeight)} />
          <MiniStat label="Yuklash sanasi" value={trip.order.factoryLoadDate ? formatDate(trip.order.factoryLoadDate) : null} />
          <MiniStat label="Port (POL)" value={trip.order.pol} />
        </View>

        <View style={styles.more}>
          <Text style={styles.moreText}>Batafsil</Text>
          <Feather name="chevron-right" size={16} color={colors.accent} />
        </View>
      </Card>
    </Pressable>
  );
}

function LocationCard({ trip, sending, onSend }: { trip: DriverTripDto; sending: boolean; onSend: () => void }) {
  const { place, coords } = splitLocationLabel(trip.lastLocationText);
  const fresh = isPingFresh(trip.lastPingAt);
  return (
    <Card style={styles.location}>
      <View style={styles.locationTop}>
        <IconBadge icon="map-pin" tone={trip.lastPingAt ? (fresh ? "success" : "warning") : "accent"} />
        <View style={styles.locationText}>
          <Text style={styles.locationLabel}>Oxirgi joylashuv</Text>
          <Text style={styles.locationPlace} numberOfLines={2}>
            {place ?? (coords ? "Koordinatalar" : "Hali yuborilmagan")}
          </Text>
          {coords ? <Text style={styles.locationCoords}>{coords}</Text> : null}
        </View>
      </View>

      <View style={styles.locationMeta}>
        <View style={styles.metaItem}>
          <Feather name="clock" size={13} color={fresh ? colors.success : colors.textTertiary} />
          <Text style={[styles.metaText, fresh && { color: colors.success }]}>
            {trip.lastPingAt ? formatRelative(trip.lastPingAt) : "Yuborilmagan"}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="refresh-cw" size={13} color={colors.textTertiary} />
          <Text style={styles.metaText}>Har 3 soatda avtomatik</Text>
        </View>
      </View>

      <Button title="Joylashuvni hozir yuborish" icon="navigation" onPress={onSend} loading={sending} />
    </Card>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  date: { ...type.caption, color: colors.textSecondary, textTransform: "capitalize" },
  greeting: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.2 },

  hero: { gap: spacing.md, borderColor: colors.borderStrong },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { ...type.kicker, color: colors.accent },
  plate: { fontSize: 34, fontWeight: "800", color: colors.textPrimary, letterSpacing: 1.5, marginTop: -4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  stats: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md, columnGap: spacing.lg },
  more: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 2 },
  moreText: { ...type.caption, color: colors.accent, fontWeight: "700" },

  location: { gap: spacing.lg },
  locationTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  locationText: { flex: 1, gap: 2 },
  locationLabel: { ...type.label, color: colors.textTertiary },
  locationPlace: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  locationCoords: { fontSize: 12, color: colors.textTertiary, fontVariant: ["tabular-nums"] },
  locationMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
});
