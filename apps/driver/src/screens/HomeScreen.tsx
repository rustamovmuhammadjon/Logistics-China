import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { clearToken, driverRequest, unpairDriver } from "../api";
import { sendCurrentLocation, startLocationUpdates, stopLocationUpdates } from "../location";
import { colors, radius, spacing } from "../theme";

type DriverMe = {
  driver: {
    lastLocationText: string | null;
    lastPingAt: string | null;
    truck: {
      plateNumber: string | null;
      trailerPlateNumber: string | null;
      orderName: string;
      subOrderName: string | null;
      currentLocation: string | null;
    };
  };
};

export function HomeScreen({ onUnpaired }: { onUnpaired: () => Promise<void> }) {
  const [me, setMe] = useState<DriverMe["driver"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await driverRequest<DriverMe>("/me");
      setMe(data.driver);
      try {
        await startLocationUpdates();
      } catch (locErr) {
        setError(locErr instanceof Error ? locErr.message : "Location permission is required");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assignment");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function pingNow() {
    setPending(true);
    setError(null);
    try {
      await sendCurrentLocation();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send location");
    } finally {
      setPending(false);
    }
  }

  async function unpair() {
    await stopLocationUpdates();
    // Must happen before clearToken() — the request still needs the token
    // to authenticate as this driver.
    await unpairDriver();
    await clearToken();
    await onUnpaired();
  }

  return (
    <LinearGradient colors={[colors.bg, colors.bgElevated]} style={styles.fill}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Biriktirilgan yuk</Text>
            <Text style={styles.title}>{me?.truck?.plateNumber || "Truck"}</Text>
          </View>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="truck-outline" size={26} color={colors.accent} />
          </View>
        </View>

        <View style={styles.chipRow}>
          {me?.truck?.trailerPlateNumber ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Treyler · {me.truck.trailerPlateNumber}</Text>
            </View>
          ) : null}
          {me?.truck?.orderName ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {me.truck.orderName}
                {me.truck.subOrderName ? ` · ${me.truck.subOrderName}` : ""}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="map-pin" size={18} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>Oxirgi joylashuv</Text>
            <Text style={styles.cardValue} numberOfLines={2}>
              {me?.lastLocationText || me?.truck?.currentLocation || "Hali yuborilmagan"}
            </Text>
            <Text style={styles.cardHint}>
              {me?.lastPingAt ? new Date(me.lastPingAt).toLocaleString() : "Ilova har 3 soatda avtomatik yuboradi"}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.spacer} />

        <Pressable
          style={({ pressed }) => [styles.button, pending && styles.buttonDisabled, pressed && styles.buttonPressed]}
          onPress={() => void pingNow()}
          disabled={pending}
        >
          {pending ? (
            <Text style={styles.buttonText}>Yuborilmoqda…</Text>
          ) : (
            <>
              <Feather name="navigation" size={17} color={colors.bg} />
              <Text style={styles.buttonText}>Hozir joylashuvni yuborish</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
          onPress={() => void unpair()}
        >
          <Feather name="log-out" size={15} color={colors.textTertiary} />
          <Text style={styles.linkText}>Shu telefondan chiqish</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  wrap: { flex: 1, padding: spacing.xl, paddingTop: 64 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: colors.textPrimary, fontSize: 34, fontWeight: "800", marginTop: 4 },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "500" },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  cardLabel: { color: colors.textTertiary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  cardValue: { color: colors.textPrimary, fontSize: 18, fontWeight: "600" },
  cardHint: { color: colors.textSecondary, fontSize: 13 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  errorText: { color: colors.danger, fontSize: 13, flexShrink: 1 },
  spacer: { flex: 1 },
  button: {
    flexDirection: "row",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: "700" },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  linkText: { color: colors.textTertiary, fontSize: 14 },
});
