import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { api, getToken } from "./api";

export const LOCATION_TASK = "logistics-driver-location";
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const FIX_TIMEOUT_MS = 20_000;
const LAST_KNOWN_MAX_AGE_MS = 15 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Location request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// A fresh fix can hang indoors or on a cold GPS; a recent last-known
// position is good enough for a 3-hourly report and beats sending nothing.
async function readPosition() {
  try {
    return await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), FIX_TIMEOUT_MS);
  } catch (err) {
    const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }).catch(() => null);
    if (last) return last;
    throw err;
  }
}

async function describePlace(latitude: number, longitude: number) {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return null;
    return [place.city || place.subregion, place.region, place.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

export async function sendCurrentLocation() {
  const token = await getToken();
  if (!token) return null;

  const position = await readPosition();
  const { latitude, longitude, accuracy } = position.coords;
  return api.sendLocation({
    lat: latitude,
    lng: longitude,
    accuracy: accuracy ?? null,
    locationText: await describePlace(latitude, longitude),
  });
}

export function registerLocationTask() {
  if (TaskManager.isTaskDefined(LOCATION_TASK)) return;
  TaskManager.defineTask(LOCATION_TASK, async () => {
    try {
      await sendCurrentLocation();
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

// For a manual send: asks only when the driver hasn't answered yet, so
// tapping the button never re-prompts someone who already allowed it.
export async function ensureForegroundPermission() {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return;
  const asked = current.canAskAgain ? await Location.requestForegroundPermissionsAsync() : current;
  if (!asked.granted) throw new Error("Location permission is required");
}

export async function requestLocationPermission() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new Error("Location permission is required");
  }
  await Location.requestBackgroundPermissionsAsync().catch(() => undefined);
}

export async function startLocationUpdates() {
  await requestLocationPermission();
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (!started) {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: THREE_HOURS_MS,
        distanceInterval: 0,
        deferredUpdatesInterval: THREE_HOURS_MS,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: "Logistics Driver",
          notificationBody: "Joylashuv har 3 soatda operatorga yuboriladi.",
        },
      });
    } catch {
      // Expo Go and denied background permission still allow manual pings.
    }
  }
  await BackgroundFetch.registerTaskAsync(LOCATION_TASK, {
    minimumInterval: 3 * 60 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  }).catch(() => undefined);
}

export async function stopLocationUpdates() {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => undefined);
  await BackgroundFetch.unregisterTaskAsync(LOCATION_TASK).catch(() => undefined);
}
