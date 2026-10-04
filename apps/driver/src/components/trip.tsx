import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { DriverTripDto } from "@logistics/shared";
import { colors, radius, spacing, type } from "../theme";
import { formatDate, formatRoute } from "../format";
import { StatusPill } from "./ui";

export function tripTitle(trip: DriverTripDto) {
  return [trip.order.reference, trip.order.subOrderName].filter(Boolean).join(" · ");
}

// Origin and destination as two stops on a line — the shape a driver
// already reads a route in.
export function RouteView({ origin, destination }: { origin: string | null; destination: string | null }) {
  return (
    <View style={styles.route}>
      <View style={styles.routeRail}>
        <View style={styles.routeDotStart} />
        <View style={styles.routeLine} />
        <Feather name="map-pin" size={16} color={colors.accent} />
      </View>
      <View style={styles.routeStops}>
        <View style={styles.routeStop}>
          <Text style={styles.routeLabel}>Qayerdan</Text>
          <Text style={[styles.routeValue, !origin && styles.muted]}>{origin || "Ko'rsatilmagan"}</Text>
        </View>
        <View style={styles.routeStop}>
          <Text style={styles.routeLabel}>Qayerga</Text>
          <Text style={[styles.routeValue, !destination && styles.muted]}>{destination || "Ko'rsatilmagan"}</Text>
        </View>
      </View>
    </View>
  );
}

export function MiniStat({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, !value && styles.muted]} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

export function TripCard({ trip, current, onPress }: { trip: DriverTripDto; current: boolean; onPress: () => void }) {
  const route = formatRoute(trip.order.origin, trip.order.destination);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, current && styles.cardCurrent, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {tripTitle(trip)}
        </Text>
        <StatusPill status={trip.status} />
      </View>
      {route ? (
        <View style={styles.cardRow}>
          <Feather name="navigation" size={14} color={colors.textSecondary} />
          <Text style={styles.cardRoute} numberOfLines={1}>
            {route}
          </Text>
        </View>
      ) : null}
      <View style={styles.cardMeta}>
        <View style={styles.cardRow}>
          <Feather name="truck" size={13} color={colors.textTertiary} />
          <Text style={styles.cardMetaText}>{trip.truck.plateNumber || "—"}</Text>
        </View>
        <View style={styles.cardRow}>
          <Feather name="calendar" size={13} color={colors.textTertiary} />
          <Text style={styles.cardMetaText}>{formatDate(trip.pairedAt)}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textTertiary} style={styles.chevron} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textTertiary, fontWeight: "400" },
  pressed: { opacity: 0.85 },

  route: { flexDirection: "row", gap: spacing.md },
  routeRail: { alignItems: "center", paddingTop: 5, paddingBottom: 3 },
  routeDotStart: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.textSecondary },
  routeLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: colors.borderStrong, marginVertical: 4 },
  routeStops: { flex: 1, gap: spacing.md },
  routeStop: { gap: 2 },
  routeLabel: { fontSize: 11, color: colors.textTertiary, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  routeValue: { fontSize: 16, color: colors.textPrimary, fontWeight: "600" },

  miniStat: { flexBasis: "47%", flexGrow: 1, gap: 3 },
  miniLabel: { fontSize: 11, color: colors.textTertiary, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  miniValue: { ...type.caption, color: colors.textPrimary, fontWeight: "600" },

  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardCurrent: { borderColor: colors.success },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardRoute: { ...type.caption, color: colors.textSecondary, flex: 1 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: 2 },
  cardMetaText: { fontSize: 12, color: colors.textTertiary, fontWeight: "600" },
  chevron: { marginLeft: "auto" },
});
