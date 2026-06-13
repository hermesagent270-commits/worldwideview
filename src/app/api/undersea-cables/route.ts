import { NextResponse } from "next/server";

// The undersea-cables marketplace plugin loads its geometry from the
// same-origin path /api/undersea-cables (Cesium GeoJsonDataSource.load).
// Upstream's hosted deployment served this; a self-host must provide it.
// We proxy TeleGeography's open submarine cable map GeoJSON and let
// Next.js cache it (cables change rarely — 24h is plenty). Nothing stored.
export const revalidate = 86400;

const FEED_URL = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json";

function isValidFeature(feature: any): boolean {
    const t = feature?.geometry?.type;
    const coords = feature?.geometry?.coordinates;
    return (t === "MultiLineString" || t === "LineString") && Array.isArray(coords) && coords.length > 0;
}

export async function GET() {
    try {
        const response = await fetch(FEED_URL, {
            headers: {
                Accept: "application/geo+json, application/json",
                "User-Agent": "WorldWideView/1.0",
            },
            next: { revalidate },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch submarine cable feed" },
                { status: 502 },
            );
        }

        const data = await response.json();
        const features = Array.isArray(data?.features)
            ? data.features.filter(isValidFeature)
            : [];

        return NextResponse.json({ type: "FeatureCollection", features });
    } catch (error) {
        console.error("[UnderseaCablesRoute] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch submarine cable feed" },
            { status: 502 },
        );
    }
}
