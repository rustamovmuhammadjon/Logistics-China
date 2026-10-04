import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { DriverMeDto, DriverProfileDto, DriverTripDto } from "@logistics/shared";
import { api, ApiError, clearToken, getToken, saveIdentity, setToken } from "./api";
import { errorMessage } from "./i18n";
import { startLocationUpdates, stopLocationUpdates } from "./location";

export type SessionStatus = "loading" | "offline" | "signedOut" | "needsRegistration" | "ready";

type SessionValue = {
  status: SessionStatus;
  me: DriverMeDto | null;
  // Why the driver was signed out (shown on the code screen), if not by choice.
  notice: string | null;
  // Location permission trouble, shown on Home with a retry.
  locationIssue: string | null;
  trips: DriverTripDto[] | null;
  refresh: () => Promise<string | null>;
  applyAuth: (result: { token: string; me: DriverMeDto }) => Promise<void>;
  signOut: () => Promise<void>;
  // Every screen routes its request errors through here: a 401 ends the
  // session in one place, anything else comes back as an Uzbek message.
  handleError: (err: unknown) => string;
  setProfile: (profile: DriverProfileDto) => void;
  patchCurrentTrip: (patch: Partial<DriverTripDto>) => void;
  loadTrips: () => Promise<string | null>;
  retryLocation: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

const FOREGROUND_REFRESH_MS = 30_000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [me, setMe] = useState<DriverMeDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [locationIssue, setLocationIssue] = useState<string | null>(null);
  const [trips, setTrips] = useState<DriverTripDto[] | null>(null);
  const trackedTrip = useRef<string | null>(null);
  const lastRefresh = useRef(0);
  const statusRef = useRef(status);
  statusRef.current = status;
  const currentTripId = useRef<string | null>(null);
  currentTripId.current = me?.currentTrip?.id ?? null;

  const endSession = useCallback(async (reason: string | null) => {
    await clearToken();
    trackedTrip.current = null;
    await stopLocationUpdates().catch(() => undefined);
    setMe(null);
    setTrips(null);
    setLocationIssue(null);
    setNotice(reason);
    setStatus("signedOut");
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      const message = errorMessage(err);
      if (err instanceof ApiError && err.status === 401) void endSession(message);
      return message;
    },
    [endSession]
  );

  const acceptMe = useCallback((next: DriverMeDto) => {
    lastRefresh.current = Date.now();
    setMe(next);
    setStatus(next.registered ? "ready" : "needsRegistration");
    if (next.profile) void saveIdentity(next.profile);
  }, []);

  const refresh = useCallback(async () => {
    try {
      acceptMe((await api.me()).me);
      return null;
    } catch (err) {
      const message = handleError(err);
      // Keep whatever is already on screen; only a first load has nothing.
      setStatus((current) => (current === "loading" ? "offline" : current));
      return message;
    }
  }, [acceptMe, handleError]);

  useEffect(() => {
    void (async () => {
      if (!(await getToken())) {
        setStatus("signedOut");
        return;
      }
      await refresh();
    })();
  }, [refresh]);

  // Coming back to the app is when the trip is most likely to have changed
  // (closed, re-paired) — cheaper than polling while it sits in a pocket.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (Date.now() - lastRefresh.current < FOREGROUND_REFRESH_MS) return;
      const current = statusRef.current;
      if (current === "ready" || current === "needsRegistration" || current === "offline") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const tripId = status === "ready" ? (me?.currentTrip?.id ?? null) : null;

  useEffect(() => {
    if (status === "loading" || status === "offline") return;
    if (!tripId) {
      if (trackedTrip.current) {
        trackedTrip.current = null;
        void stopLocationUpdates().catch(() => undefined);
      }
      return;
    }
    if (trackedTrip.current === tripId) return;
    trackedTrip.current = tripId;
    startLocationUpdates()
      .then(() => setLocationIssue(null))
      .catch((err) => setLocationIssue(errorMessage(err)));
  }, [status, tripId]);

  const retryLocation = useCallback(async () => {
    try {
      await startLocationUpdates();
      setLocationIssue(null);
    } catch (err) {
      setLocationIssue(errorMessage(err));
    }
  }, []);

  const applyAuth = useCallback(
    async (result: { token: string; me: DriverMeDto }) => {
      await setToken(result.token);
      setNotice(null);
      setTrips(null);
      acceptMe(result.me);
    },
    [acceptMe]
  );

  const signOut = useCallback(async () => {
    await api.signOut().catch(() => undefined);
    await endSession(null);
  }, [endSession]);

  const setProfile = useCallback((profile: DriverProfileDto) => {
    setMe((current) => (current ? { ...current, profile } : current));
    void saveIdentity(profile);
  }, []);

  const patchCurrentTrip = useCallback((patch: Partial<DriverTripDto>) => {
    setMe((current) =>
      current?.currentTrip ? { ...current, currentTrip: { ...current.currentTrip, ...patch } } : current
    );
    setTrips((current) =>
      current ? current.map((trip) => (trip.id === currentTripId.current ? { ...trip, ...patch } : trip)) : current
    );
  }, []);

  const loadTrips = useCallback(async () => {
    try {
      setTrips((await api.trips()).trips);
      return null;
    } catch (err) {
      return handleError(err);
    }
  }, [handleError]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      me,
      notice,
      locationIssue,
      trips,
      refresh,
      applyAuth,
      signOut,
      handleError,
      setProfile,
      patchCurrentTrip,
      loadTrips,
      retryLocation,
    }),
    [status, me, notice, locationIssue, trips, refresh, applyAuth, signOut, handleError, setProfile, patchCurrentTrip, loadTrips, retryLocation]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
