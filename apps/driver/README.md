# Driver app (Android APK)

Sideload this APK to drivers. The same Expo project can later produce an iOS build without rewriting screens.

## 1. API URL

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the **public website** (Vercel) or the Railway backend origin. The app calls `/api/driver/pair` and `/api/driver/location`.

Physical phone on local Wi-Fi: `http://YOUR-LAN-IP:3000` (Next proxy) or `:4000` (Express).

## 2. Install and run

```bash
pnpm install
pnpm --filter driver start
```

Then press `a` for Android emulator, or scan the QR with Expo Go for a quick pairing test (background GPS is more reliable in a real APK).

## 3. Build an APK (no Play Store)

```bash
cd apps/driver
npx eas-cli login
npx eas-cli build -p android --profile preview
```

EAS returns a download URL. Send that `.apk` to drivers.

## How pairing works

1. Operator (or admin) on a sub-order: truck plate + driver phone → 6-digit code (shown once).
2. Operator tells the driver the code.
3. Driver enters phone + code. Server issues a token, the code is deleted, the token stays in SecureStore.
4. The app sends GPS every 3 hours (foreground service + background fetch). That location appears on the web truck card.
