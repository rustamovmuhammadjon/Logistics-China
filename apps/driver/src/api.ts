import * as SecureStore from "expo-secure-store";
import type {
  ChatMessageDto,
  DriverChatSummaryDto,
  DriverLocationPingDto,
  DriverMeDto,
  DriverProfileDto,
  DriverTripDto,
  TruckListingDto,
} from "@logistics/shared";

const TOKEN_KEY = "driver_token";
// Name + phone from the last registration on this phone, so a returning
// driver only has to confirm them when the next trip's code is entered.
const IDENTITY_KEY = "driver_identity";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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

// SecureStore is slow enough to notice on every request — read it once.
let tokenCache: string | null | undefined;

export async function getToken() {
  if (tokenCache === undefined) tokenCache = await SecureStore.getItemAsync(TOKEN_KEY);
  return tokenCache;
}

export async function setToken(token: string) {
  tokenCache = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  tokenCache = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export type SavedIdentity = { firstName: string; lastName: string; phone: string };

export async function getSavedIdentity(): Promise<SavedIdentity | null> {
  try {
    const raw = await SecureStore.getItemAsync(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as SavedIdentity) : null;
  } catch {
    return null;
  }
}

export async function saveIdentity(profile: SavedIdentity) {
  const value: SavedIdentity = { firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone };
  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(value)).catch(() => undefined);
}

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const base = apiBase();
  if (!base) throw new ApiError(0, "EXPO_PUBLIC_API_URL is not set");

  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${base}/api/driver${path}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Network request failed");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data;
}

type AuthResult = { token: string; me: DriverMeDto };

export type ProfilePatch = Partial<
  Pick<
    DriverProfileDto,
    | "firstName"
    | "lastName"
    | "phone"
    | "dateOfBirth"
    | "licenseNumber"
    | "truckPlate"
    | "truckModel"
    | "trailerPlate"
    | "trailerType"
  >
>;

export const api = {
  pair: (code: string) => request<AuthResult>("/pair", { method: "POST", body: { code } }),
  register: (input: SavedIdentity) => request<AuthResult>("/register", { method: "POST", body: input }),
  me: () => request<{ me: DriverMeDto }>("/me"),
  updateProfile: (patch: ProfilePatch) =>
    request<{ profile: DriverProfileDto }>("/profile", { method: "PATCH", body: patch }),
  trips: () => request<{ trips: DriverTripDto[] }>("/trips"),
  trip: (id: string) =>
    request<{ trip: DriverTripDto; pings: DriverLocationPingDto[] }>(`/trips/${encodeURIComponent(id)}`),
  sendLocation: (body: { lat: number; lng: number; accuracy: number | null; locationText: string | null }) =>
    request<{ ok: true; lastPingAt: string; lastLocationText: string }>("/location", { method: "POST", body }),
  signOut: () => request<{ ok: true }>("/unpair", { method: "POST" }),
  chats: () => request<{ chats: DriverChatSummaryDto[] }>("/chats"),
  unreadCount: () => request<{ count: number }>("/chats/unread-count"),
  thread: (operatorId: string) =>
    request<{ messages: ChatMessageDto[] }>(`/chats/${encodeURIComponent(operatorId)}/messages`),
  send: (operatorId: string, text: string) =>
    request<{ message: ChatMessageDto }>(`/chats/${encodeURIComponent(operatorId)}/messages`, {
      method: "POST",
      body: { text },
    }),
  listing: () => request<{ listing: TruckListingDto | null }>("/listing"),
  // "Mening mashinam": the vehicle and its ad, saved together.
  saveTruck: (body: TruckInput) =>
    request<{ profile: DriverProfileDto; listing: TruckListingDto }>("/truck", { method: "PUT", body }),
};

export type TruckInput = Partial<Omit<TruckListingDto, "updatedAt">> &
  Pick<ProfilePatch, "truckPlate" | "truckModel" | "trailerPlate">;
