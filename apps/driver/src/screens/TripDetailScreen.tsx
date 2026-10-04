import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { DriverLocationPingDto, DriverTripDto } from "@logistics/shared";
import { api } from "../api";
import { useSession } from "../session";
import { colors, spacing, type } from "../theme";
import { formatDate, formatDateTime, formatWeight, splitLocationLabel } from "../format";
import { Card, InfoRow, Notice, Screen, ScreenHeader, SectionTitle, StatusPill } from "../components/ui";
import { RouteView, tripTitle } from "../components/trip";

export function TripDetailScreen({ tripId, onBack }: { tripId: string; onBack: () => void }) {
  const { handleError } = useSession();
  const [data, setData] = useState<{ trip: DriverTripDto; pings: DriverLocationPingDto[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.trip(tripId));
      setError(null);
    } catch (err) {
      setError(handleError(err));
    }
  }, [tripId, handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const trip = data?.trip;

  return (
    <Screen edges={["top", "bottom"]} onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenHeader title={trip ? tripTitle(trip) : "Reys"} subtitle={trip ? `Ulangan: ${formatDate(trip.pairedAt)}` : null} onBack={onBack} />

      {error ? <Notice message={error} actionLabel="Qayta" onAction={() => void load()} /> : null}
      {!data && !error ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      {trip ? (
        <>
          <StatusPill status={trip.status} />

          <Card style={styles.gap}>
            <RouteView origin={trip.order.origin} destination={trip.order.destination} />
          </Card>

          <SectionTitle title="Yuk va transport" />
          <Card style={styles.list}>
            <InfoRow label="Yuk" value={trip.order.commodity} />
            <InfoRow label="Og'irlik" value={formatWeight(trip.truck.cargoWeight)} />
            <InfoRow label="Tavsif" value={trip.truck.cargoDescription} />
            <InfoRow label="Mashina" value={trip.truck.plateNumber} />
            <InfoRow label="Treyler" value={trip.truck.trailerPlateNumber} last />
          </Card>

          <SectionTitle title="Sanalar" />
          <Card style={styles.list}>
            <InfoRow label="Port (POL)" value={trip.order.pol} />
            <InfoRow label="Zavoddan yuklash" value={trip.order.factoryLoadDate ? formatDate(trip.order.factoryLoadDate) : null} />
            <InfoRow label="Boshlangan" value={trip.order.openedAt ? formatDate(trip.order.openedAt) : null} />
            <InfoRow label="Yetib kelgan" value={trip.order.arrivedAt ? formatDate(trip.order.arrivedAt) : null} last />
          </Card>

          <SectionTitle title={`Joylashuv tarixi (${data.pings.length})`} />
          {data.pings.length === 0 ? (
            <Text style={styles.empty}>Bu reysda joylashuv hali yuborilmagan.</Text>
          ) : (
            <Card style={styles.list}>
              {data.pings.map((ping, index) => {
                const { place, coords } = splitLocationLabel(ping.locationText);
                const last = index === data.pings.length - 1;
                return (
                  <View key={ping.id} style={styles.ping}>
                    <View style={styles.pingRail}>
                      <View style={[styles.pingDot, index === 0 && styles.pingDotLatest]} />
                      {!last ? <View style={styles.pingLine} /> : null}
                    </View>
                    <View style={[styles.pingBody, !last && styles.pingBodySpaced]}>
                      <Text style={styles.pingPlace} numberOfLines={2}>
                        {place ?? coords ?? `${ping.lat.toFixed(5)}, ${ping.lng.toFixed(5)}`}
                      </Text>
                      <Text style={styles.pingTime}>{formatDateTime(ping.recordedAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.xxl },
  gap: { gap: spacing.md },
  list: { paddingVertical: spacing.xs },
  empty: { ...type.caption, color: colors.textTertiary },
  ping: { flexDirection: "row", gap: spacing.md, paddingTop: spacing.md },
  pingRail: { alignItems: "center", width: 12, paddingTop: 4 },
  pingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderStrong },
  pingDotLatest: { backgroundColor: colors.success },
  pingLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  pingBody: { flex: 1, gap: 2 },
  pingBodySpaced: { paddingBottom: spacing.xs },
  pingPlace: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  pingTime: { fontSize: 12, color: colors.textTertiary },
});
