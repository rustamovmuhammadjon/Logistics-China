import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { driverRequest, getToken } from "./api";

export const LOCATION_TASK = "logistics-driver-location";
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

export async function sendCurrentLocation() {
  const token = await getToken();
  if (!token) return { skipped: true as const };

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  let locationText: string | null = null;
  try {
    const places = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    const place = places[0];
    if (place) {
      locationText = [place.city || place.subregion, place.region, place.country].filter(Boolean).join(", ");
    }
  } catch {
    locationText = null;
  }

  await driverRequest("/location", {
    method: "POST",
    body: JSON.stringify({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      locationText,
    }),
  });

  return { skipped: false as const, at: new Date().toISOString() };
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
          notificationBody: "Location is shared with the operator every 3 hours.",
        },
      });
    } catch {
      // Emulators and denied background permission still allow manual pings.
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
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  await BackgroundFetch.unregisterTaskAsync(LOCATION_TASK).catch(() => undefined);
}
