import type { CameraAdapter, CameraFeature } from "./types";

/**
 * Australia live traffic cameras — keyless public feed from livetraffic.com
 * (NSW Live Traffic). Ported from simplifaisoul/osiris (MIT), 2026-06-15.
 */
const FEED_URL = "https://www.livetraffic.com/datajson/all-feeds-web.json";

export const osirisAustraliaAdapter: CameraAdapter = {
    id: "osiris-au",
    displayName: "Australia (Live Traffic)",
    region: "Australia",
    cacheTtlMs: 60 * 60 * 1000,
    async fetch(): Promise<CameraFeature[]> {
        const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return [];
        const data = await res.json();
        const arr: any[] = Array.isArray(data) ? data : [];
        return arr
            .filter((e) => e?.eventType === "liveCams")
            .map((cam): CameraFeature | null => {
                const lon = cam?.geometry?.coordinates?.[0];
                const lat = cam?.geometry?.coordinates?.[1];
                const stream = cam?.properties?.href || null;
                if (!Number.isFinite(lon) || !Number.isFinite(lat) || !stream) return null;
                return {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [lon, lat] },
                    properties: {
                        id: String(cam.path ?? `au-${lat},${lon}`),
                        source: "osiris-au",
                        stream,
                        streamType: "image",
                        name: cam?.properties?.title || "Australia Camera",
                        country: "Australia",
                        city: cam?.properties?.region || "",
                        extra: { origin: "Live Traffic" },
                    },
                };
            })
            .filter((f): f is CameraFeature => f !== null);
    },
};
