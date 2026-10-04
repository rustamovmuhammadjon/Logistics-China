import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "./src/session";
import { colors } from "./src/theme";
import { PairScreen } from "./src/screens/PairScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { MainScreen } from "./src/screens/MainScreen";
import { Button, EmptyState, Screen } from "./src/components/ui";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionProvider>
        <Root />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { status } = useSession();
  switch (status) {
    case "loading":
      return (
        <View style={styles.splash}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      );
    case "offline":
      return <OfflineScreen />;
    case "signedOut":
      return <PairScreen />;
    case "needsRegistration":
      return <RegisterScreen />;
    case "ready":
      return <MainScreen />;
  }
}

function OfflineScreen() {
  const { refresh, signOut } = useSession();
  const [retrying, setRetrying] = useState(false);
  return (
    <Screen edges={["top", "bottom"]} contentStyle={styles.offline}>
      <EmptyState
        icon="wifi-off"
        title="Serverga ulanib bo'lmadi"
        text="Internet aloqasini tekshiring va qayta urinib ko'ring. Ma'lumotlaringiz saqlangan."
        action={
          <View style={styles.offlineActions}>
            <Button
              title="Qayta urinish"
              icon="refresh-cw"
              loading={retrying}
              onPress={async () => {
                setRetrying(true);
                await refresh();
                setRetrying(false);
              }}
            />
            <Button title="Chiqish" variant="ghost" onPress={() => void signOut()} disabled={retrying} />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  offline: { flexGrow: 1, justifyContent: "center" },
  offlineActions: { gap: 8 },
});
