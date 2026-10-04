import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { api } from "../api";
import { useSession } from "../session";
import { colors } from "../theme";
import { displayDateToIso, isoToDisplayDate, maskDateInput } from "../format";
import { PhoneField, isPhoneValid, phoneDigits } from "../components/PhoneField";
import { Button, Notice, Screen, ScreenHeader, TextField } from "../components/ui";

const NAME_PATTERN = /^\p{L}[\p{L}\s'’ʻʼ`-]*$/u;

type FieldErrors = Partial<Record<"firstName" | "lastName" | "phone" | "dateOfBirth", string>>;

export function EditProfileScreen({ onBack }: { onBack: () => void }) {
  const { me, setProfile, handleError } = useSession();
  const profile = me?.profile;
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [phone, setPhone] = useState(phoneDigits(profile?.phone));
  const [dateOfBirth, setDateOfBirth] = useState(isoToDisplayDate(profile?.dateOfBirth));
  const [licenseNumber, setLicenseNumber] = useState(profile?.licenseNumber ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const errors: FieldErrors = {};
    if (firstName.trim().length < 2 || !NAME_PATTERN.test(firstName.trim())) errors.firstName = "Ismingizni kiriting";
    if (lastName.trim().length < 2 || !NAME_PATTERN.test(lastName.trim())) errors.lastName = "Familiyangizni kiriting";
    if (!isPhoneValid(phone)) errors.phone = "Telefon raqamini davlat kodi bilan to'liq kiriting";
    const isoDate = displayDateToIso(dateOfBirth);
    if (isoDate === undefined) errors.dateOfBirth = "Sanani KK.OO.YYYY ko'rinishida kiriting";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const { profile: updated } = await api.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: `+${phone}`,
        dateOfBirth: isoDate ?? null,
        licenseNumber: licenseNumber.trim() || null,
      });
      setProfile(updated);
      onBack();
    } catch (err) {
      setError(handleError(err));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader title="Shaxsiy ma'lumotlar" onBack={onBack} />
        <TextField label="Ism" icon="user" value={firstName} onChangeText={setFirstName} autoCapitalize="words" error={fieldErrors.firstName} />
        <TextField label="Familiya" icon="user" value={lastName} onChangeText={setLastName} autoCapitalize="words" error={fieldErrors.lastName} />
        <PhoneField label="Telefon raqami" digits={phone} onChangeDigits={setPhone} error={fieldErrors.phone} />
        <TextField
          label="Tug'ilgan sana"
          icon="calendar"
          value={dateOfBirth}
          onChangeText={(text) => setDateOfBirth(maskDateInput(text))}
          placeholder="KK.OO.YYYY"
          keyboardType="number-pad"
          maxLength={10}
          error={fieldErrors.dateOfBirth}
        />
        <TextField
          label="Haydovchilik guvohnomasi raqami"
          icon="credit-card"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={30}
          placeholder="Masalan, AF1234567"
        />
        {error ? <Notice message={error} /> : null}
        <Button title="Saqlash" icon="check" onPress={save} loading={saving} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
});
