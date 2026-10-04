import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme";

export function QrScanner({ onScanned, onClose }: { onScanned: (data: string) => void; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.fill}>
        <Text style={styles.permissionText}>
          {permission?.canAskAgain === false
            ? "Kamera uchun ruxsat kerak. Sozlamalardan ruxsat bering."
            : "QR kodni skanerlash uchun kameraga ruxsat bering."}
        </Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Ruxsat berish</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={onClose}>
          <Feather name="arrow-left" size={15} color={colors.textTertiary} />
          <Text style={styles.linkText}>Orqaga</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={styles.fill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={(result: BarcodeScanningResult) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onScanned(result.data);
        }}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.frame} />
        <Text style={styles.hint}>QR kodni ramka ichiga joylashtiring</Text>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Feather name="x" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  frame: {
    width: 230,
    height: 230,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  hint: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  closeButton: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl * 2,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignSelf: "center",
    marginTop: spacing.lg,
  },
  buttonText: { color: colors.bg, fontSize: 15, fontWeight: "700" },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  linkText: { color: colors.textTertiary, fontSize: 14 },
});
