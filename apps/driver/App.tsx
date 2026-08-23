import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { getToken } from "./src/api";
import { PairScreen } from "./src/screens/PairScreen";
import { HomeScreen } from "./src/screens/HomeScreen";

export default function App() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setToken(await getToken());
    } catch {
      setToken(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" }}>
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar style="light" />
      {token ? <HomeScreen onUnpaired={reload} /> : <PairScreen onPaired={reload} />}
    </View>
  );
}
