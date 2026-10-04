import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../session";
import { useNav } from "../navigation";
import { colors, radius, spacing } from "../theme";
import { Button, EmptyState, Notice, ScreenHeader } from "../components/ui";
import { TripCard } from "../components/trip";

export function TripsScreen() {
  const { trips, loadTrips, me } = useSession();
  const nav = useNav();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentTripId = me?.currentTrip?.id;

  const load = useCallback(async () => {
    setError(await loadTrips());
  }, [loadTrips]);

  // The session drops the cached list whenever a new trip is attached.
  useEffect(() => {
    if (trips === null) void load();
  }, [trips, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const stats = useMemo(() => {
    const list = trips ?? [];
    return {
      total: list.length,
      completed: list.filter((trip) => trip.status === "COMPLETED").length,
      active: list.filter((trip) => trip.status === "ACTIVE").length,
    };
  }, [trips]);

  return (
    <LinearGradient colors={[colors.bg, colors.bgElevated]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={["top"]}>
        <FlatList
          data={trips ?? []}
          keyExtractor={(trip) => trip.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <ScreenHeader title="Reyslar" subtitle="Siz haydagan barcha reyslar" />
              <View style={styles.stats}>
                <Stat label="Jami" value={stats.total} />
                <Stat label="Yakunlangan" value={stats.completed} />
                <Stat label="Faol" value={stats.active} highlight={stats.active > 0} />
              </View>
              {error ? <Notice message={error} actionLabel="Qayta" onAction={() => void load()} /> : null}
            </View>
          }
          ItemSeparatorComponent={Separator}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              current={item.id === currentTripId}
              onPress={() => nav.push({ name: "trip", tripId: item.id })}
            />
          )}
          ListEmptyComponent={
            trips === null && !error ? (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            ) : trips ? (
              <EmptyState
                icon="list"
                title="Hali reyslar yo'q"
                text="Operator bergan kod bilan reysga ulanganingizda, u shu yerda paydo bo'ladi."
                action={<Button title="Kodni kiritish" icon="key" onPress={() => nav.push({ name: "attachTrip" })} />}
              />
            ) : null
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, highlight && { color: colors.success }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  headerBlock: { gap: spacing.lg, marginBottom: spacing.lg },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  separator: { height: spacing.md },
  loader: { marginTop: spacing.xxl },
});
