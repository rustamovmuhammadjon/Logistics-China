import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { clearToken, driverRequest } from "../api";
import { sendCurrentLocation, startLocationUpdates, stopLocationUpdates } from "../location";

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
    await clearToken();
    await onUnpaired();
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Biriktirilgan yuk</Text>
      <Text style={styles.title}>{me?.truck?.plateNumber || "Truck"}</Text>
      {me?.truck?.trailerPlateNumber ? (
        <Text style={styles.meta}>Treyler: {me.truck.trailerPlateNumber}</Text>
      ) : null}
      <Text style={styles.meta}>
        {me?.truck?.orderName}
        {me?.truck?.subOrderName ? ` · ${me.truck.subOrderName}` : ""}
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Oxirgi joylashuv</Text>
        <Text style={styles.cardValue}>{me?.lastLocationText || me?.truck?.currentLocation || "Hali yuborilmagan"}</Text>
        <Text style={styles.cardHint}>
          {me?.lastPingAt ? new Date(me.lastPingAt).toLocaleString() : "Ilova har 3 soatda avtomatik yuboradi"}
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={() => void pingNow()} disabled={pending}>
        <Text style={styles.buttonText}>{pending ? "Yuborilmoqda…" : "Hozir joylashuvni yuborish"}</Text>
      </Pressable>
      <Pressable onPress={() => void unpair()}>
        <Text style={styles.link}>Shu telefondan chiqish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, paddingTop: 72, gap: 10 },
  kicker: { color: "#7dd3fc", fontSize: 13, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: "white", fontSize: 32, fontWeight: "800" },
  meta: { color: "#94a3b8", fontSize: 15 },
  card: { backgroundColor: "#1e293b", borderRadius: 18, padding: 18, marginTop: 16, gap: 6 },
  cardLabel: { color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  cardValue: { color: "white", fontSize: 18, fontWeight: "600" },
  cardHint: { color: "#94a3b8", fontSize: 13 },
  error: { color: "#fca5a5" },
  button: { backgroundColor: "#0284c7", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 12 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
  link: { color: "#64748b", textAlign: "center", marginTop: 18 },
});
