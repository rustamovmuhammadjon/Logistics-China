import { ApiError } from "./api";

// The backend speaks English; drivers read Uzbek. Known messages are mapped
// here, anything unrecognized is shown as-is rather than hidden.
const EXACT: Record<string, string> = {
  "Code is not valid": "Kod noto'g'ri",
  "Code is not valid or has expired": "Kod noto'g'ri yoki muddati o'tgan",
  "This truck is canceled": "Bu mashina bekor qilingan",
  "This trip is already closed": "Bu reys yopilgan",
  "This pairing is no longer active": "Bu ulanish endi faol emas",
  "Sign in again with a new code": "Operator bergan yangi kod bilan qayta kiring",
  "This truck already transferred cargo": "Bu mashina yukni boshqa mashinaga o'tkazgan",
  "This order is canceled": "Buyurtma bekor qilingan",
  "Location was just sent. Wait a minute before sending again.":
    "Joylashuv hozirgina yuborildi. Bir daqiqadan so'ng qayta urinib ko'ring.",
  "This driver account is disabled": "Hisobingiz o'chirilgan. Admin bilan bog'laning.",
  "Another driver already uses this phone number": "Bu telefon raqami boshqa haydovchiga tegishli",
  "No active trip — enter a new code from your operator": "Faol reys yo'q — operatordan yangi kod oling",
  "Complete registration first": "Avval ro'yxatdan o'ting",
  "Not authorized": "Sessiya tugadi. Qayta kiring.",
  "Trip not found": "Reys topilmadi",
  "Enter a valid date of birth": "Tug'ilgan sanani to'g'ri kiriting",
  "Location permission is required": "Joylashuvni yuborish uchun ruxsat bering",
  '"first name" is required': "Ismingizni kiriting",
  '"last name" is required': "Familiyangizni kiriting",
  '"phone" is required': "Telefon raqamini kiriting",
  "Enter a valid first name": "Ismni to'g'ri kiriting — faqat harflar",
  "Enter a valid last name": "Familiyani to'g'ri kiriting — faqat harflar",
  'Enter a valid "phone" number, including the country code': "Telefon raqamini davlat kodi bilan to'liq kiriting",
  "Enter a valid truck plate": "Mashina raqamini to'g'ri kiriting",
  "Enter a valid trailer plate": "Treyler raqamini to'g'ri kiriting",
  "Network request failed": "Internet aloqasi yo'q. Qayta urinib ko'ring.",
  "Message is empty": "Xabar bo'sh",
  "Message is too long": "Xabar juda uzun",
  "Conversation not found": "Suhbat topilmadi",
  "Add the body type and capacity before publishing": "E'lon qilish uchun kuzov turi va sig'imini kiriting",
  "Enter a valid number of axles": "O'qlar sonini to'g'ri kiriting (2–10)",
  "Length × width × height comes to over 200 m³ — check the measurements":
    "Uzunlik × eni × balandlik 200 CBM dan oshdi — o'lchamlarni tekshiring",
  "EXPO_PUBLIC_API_URL is not set": "Server manzili sozlanmagan (EXPO_PUBLIC_API_URL).",
};

const PATTERNS: [RegExp, string][] = [
  [/is too long/, "Kiritilgan matn juda uzun"],
  [/^Enter a valid (length|width|height|capacity|volume)$/, "O'lchamni to'g'ri kiriting"],
  [/location is unavailable|location services/i, "Joylashuvni aniqlab bo'lmadi. GPS yoqilganini tekshiring."],
  [/timed out/i, "Joylashuvni aniqlash uzoq davom etdi. Ochiq joyda qayta urinib ko'ring."],
];

export function translateError(message: string): string {
  if (EXACT[message]) return EXACT[message];
  for (const [pattern, text] of PATTERNS) if (pattern.test(message)) return text;
  return message;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof Error) return translateError(err.message);
  return "Xatolik yuz berdi. Qayta urinib ko'ring.";
}
