"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Map as MapIcon, X } from "lucide-react";
import { formatDateTime, type Track718EventDto } from "@logistics/shared";
import { clientApi } from "@/lib/api";

// track718's full webhook history for one truck, drawn as a route on an
// OpenStreetMap map (via Leaflet — no API key needed). Leaflet touches
// `window` the moment it's loaded, so it's imported dynamically inside an
// effect rather than at module scope, keeping this safe under SSR.
export function Track718MapButton({ eventsUrl, compact = false }: { eventsUrl: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {compact ? (
        <button
          type="button"
          className="shrink-0 text-brand-600 hover:text-brand-800"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title="View in map"
          aria-label="View in map"
        >
          <MapIcon className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button type="button" className="btn-secondary text-xs" onClick={() => setOpen(true)}>
          <MapIcon className="h-3.5 w-3.5" />
          View in map
        </button>
      )}
      {open && <Track718MapModal eventsUrl={eventsUrl} onClose={() => setOpen(false)} />}
    </>
  );
}

function Track718MapModal({ eventsUrl, onClose }: { eventsUrl: string; onClose: () => void }) {
  const [events, setEvents] = useState<Track718EventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    clientApi<{ events: Track718EventDto[] }>(eventsUrl)
      .then((data) => setEvents(data.events))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [eventsUrl]);

  useEffect(() => {
    const points = events?.filter(
      (e): e is Track718EventDto & { lat: number; lng: number } => e.lat != null && e.lng != null
    );
    if (!points || points.length === 0 || !containerRef.current || mapRef.current) return;

    let disposed = false;
    import("leaflet").then(({ default: L }) => {
      if (disposed || !containerRef.current || mapRef.current) return;

      // Bundled icon images don't resolve under Next's webpack config —
      // point them at the same CDN the package itself ships from instead.
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(latLngs, { color: "#1d4e89", weight: 3 }).addTo(map);
      points.forEach((p, i) => {
        const marker = L.marker([p.lat, p.lng]).addTo(map);
        marker.bindPopup(`${p.address || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`}<br/>${formatDateTime(p.occurredAt)}`);
        if (i === points.length - 1) marker.openPopup();
      });
      map.fitBounds(latLngs, { padding: [30, 30] });
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [events]);

  const hasPoints = events?.some((e) => e.lat != null && e.lng != null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-900">track718 route</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        {!error && !events && <p className="p-4 text-sm text-slate-400">Loading…</p>}
        {!error && events && !hasPoints && (
          <p className="p-4 text-sm text-slate-400">No GPS points received yet.</p>
        )}
        {!error && hasPoints && <div ref={containerRef} className="h-[400px] w-full" />}

        {!error && events && events.length > 0 && (
          <div className="overflow-y-auto border-t border-slate-200 p-3 text-xs">
            {events
              .slice()
              .reverse()
              .map((e) => (
                <p key={e.id} className="border-b border-slate-100 py-1 last:border-0">
                  <span className="text-slate-400">{formatDateTime(e.occurredAt)}</span>{" "}
                  {e.address || [e.city, e.country].filter(Boolean).join(", ") || "—"}
                  {e.statusText ? ` · ${e.statusText}` : ""}
                </p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
