import type { CameraAdapter, CameraFeature } from "./types";

/**
 * Austria highway webcams — ASFINAG ODO public widget feed. Keyless: the Basic
 * auth below is ASFINAG's own public map-widget credential (map_widget:tegdiw),
 * not a secret. Ported from simplifaisoul/osiris (MIT), 2026-06-15.
 */
const FEED_URL = "https://odo.asfinag.at/odo/rest/sec/resource/001/json/webcams?language=atDE";
const HEADERS: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
    Accept: "application/json",
    "Accept-Language": "en,en-US;q=0.9,de;q=0.8",
    Referer: "https://www.asfinag.at/",
    "Content-Type": "application/json; charset=utf-8",
    Authorization: "Basic bWFwX3dpZGdldDp0ZWdkaXc=",
    Origin: "https://www.asfinag.at",
};

export const osirisAsfinagAdapter: CameraAdapter = {
    id: "osiris-asfinag",
    displayName: "Austria (ASFINAG)",
    region: "Europe — Austria",
    cacheTtlMs: 60 * 60 * 1000,
    async fetch(): Promise<CameraFeature[]> {
        const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(4000), headers: HEADERS });
        if (!res.ok) return [];
        const data = await res.json();
        const arr: any[] = Array.isArray(data) ? data : [];
        return arr
            .map((cam): CameraFeature | null => {
                if (!cam?.wcs_id || !cam?.wgs84_lat || !cam?.wgs84_lon || !cam?.url_campic) return null;
                // Hungarian (Utinform) feeds are unavailable — skip, as upstream does.
                if (String(cam.wcs_id).startsWith("Utinform")) return null;
                return {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [cam.wgs84_lon, cam.wgs84_lat] },
                    properties: {
                        id: `asfinag-${cam.wcs_id}`,
                        source: "osiris-asfinag",
                        stream: cam.url_campic,
                        streamType: "image",
                        name: cam.position_txt || cam.direction_txt || "ASFINAG Webcam",
                        country: "Austria",
                        city: "Austria",
                        extra: { origin: "ASFINAG" },
                    },
                };
            })
            .filter((f): f is CameraFeature => f !== null);
    },
};
