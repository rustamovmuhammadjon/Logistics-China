import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { api, getSavedIdentity } from "../api";
import { useSession } from "../session";
import { colors, spacing, type } from "../theme";
import { PhoneField, isPhoneValid, phoneDigits } from "../components/PhoneField";
import { Button, Card, IconBadge, Notice, Screen, ScreenHeader, TextField } from "../components/ui";

const NAME_PATTERN = /^\p{L}[\p{L}\s'’ʻʼ`-]*$/u;

type FieldErrors = { firstName?: string; lastName?: string; phone?: string };

function validate(firstName: string, lastName: string, phone: string): FieldErrors {
  const errors: FieldErrors = {};
  if (firstName.trim().length < 2 || !NAME_PATTERN.test(firstName.trim())) errors.firstName = "Ismingizni kiriting";
  if (lastName.trim().length < 2 || !NAME_PATTERN.test(lastName.trim())) errors.lastName = "Familiyangizni kiriting";
  if (!isPhoneValid(phone)) errors.phone = "Telefon raqamini davlat kodi bilan to'liq kiriting";
  return errors;
}

// Shown right after a code sign-in until the driver says who they are —
// nothing else in the app opens before this is done.
export function RegisterScreen() {
  const { me, applyAuth, signOut, handleError } = useSession();
  const trip = me?.currentTrip;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    void getSavedIdentity().then((saved) => {
      if (!saved) return;
      setFirstName(saved.firstName);
      setLastName(saved.lastName);
      setPhone(phoneDigits(saved.phone));
      setPrefilled(true);
    });
  }, []);

  async function submit() {
    const errors = validate(firstName, lastName, phone);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setPending(true);
    setError(null);
    try {
      await applyAuth(
        await api.register({ firstName: firstName.trim(), lastName: lastName.trim(), phone: `+${phone}` })
      );
    } catch (err) {
      setError(handleError(err));
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader
          kicker="Ro'yxatdan o'tish"
          title="Ma'lumotlaringiz"
          subtitle="Davom etish uchun ismingiz va telefon raqamingizni kiriting."
        />

        {trip ? (
          <Card style={styles.tripCard}>
            <IconBadge icon="truck" tone="success" />
            <View style={styles.tripText}>
              <Text style={styles.tripLabel}>Reysga ulandingiz</Text>
              <Text style={styles.tripValue} numberOfLines={1}>
                {[trip.truck.plateNumber, trip.order.reference, trip.order.subOrderName].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </Card>
        ) : null}

        {prefilled ? (
          <Notice tone="success" message="Oldingi ma'lumotlaringiz to'ldirildi — tekshiring va davom eting." />
        ) : null}

        <TextField
          label="Ism"
          icon="user"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Masalan, Alisher"
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          error={fieldErrors.firstName}
        />
        <TextField
          label="Familiya"
          icon="user"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Masalan, Karimov"
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          error={fieldErrors.lastName}
        />
        <PhoneField label="Telefon raqami" digits={phone} onChangeDigits={setPhone} error={fieldErrors.phone} />

        {error ? <Notice message={error} /> : null}

        <Button title="Davom etish" icon="arrow-right" onPress={submit} loading={pending} />
        <Button title="Bekor qilish va chiqish" variant="ghost" onPress={() => void signOut()} disabled={pending} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  tripCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  tripText: { flex: 1, gap: 2 },
  tripLabel: { ...type.caption, color: colors.textSecondary },
  tripValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
});
