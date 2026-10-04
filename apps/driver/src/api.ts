import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "driver_token";

function apiBase() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  // Android emulator reaches the host machine at 10.0.2.2, not localhost.
  if (typeof __DEV__ !== "undefined" && __DEV__) return "http://10.0.2.2:4000";
  return "";
}

export function apiBaseUrl() {
  return apiBase() || "(EXPO_PUBLIC_API_URL is not set)";
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function driverRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) {
    throw new Error("EXPO_PUBLIC_API_URL is not set. Rebuild the APK with the public website URL.");
  }

  const token = await getToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}/api/driver${path}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function pairDriver(code: string) {
  const data = await driverRequest<{ token: string }>("/pair", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  await setToken(data.token);
  return data;
}

// Tell the server to revoke this pairing (so the web dashboard stops
// showing "Paired") before wiping the local token. Best-effort — if the
// phone has no connectivity right now, the sign-out still proceeds locally
// rather than trapping the driver in a pairing they can't reach anymore.
export async function unpairDriver() {
  try {
    await driverRequest("/unpair", { method: "POST" });
  } catch {
    // ignore — local sign-out still happens either way
  }
}
