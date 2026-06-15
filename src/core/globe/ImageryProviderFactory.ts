import {
    BingMapsImageryProvider,
    IonImageryProvider,
    ArcGisMapServerImageryProvider,
    UrlTemplateImageryProvider,
    BingMapsStyle,
} from "cesium";

export interface ImageryLayerEntry {
    id: string;
    name: string;
    description: string;
    thumbnail?: string;
    type: "google-3d" | "imagery";
}

export const IMAGERY_LAYERS: ImageryLayerEntry[] = [
    {
        id: "google-3d",
        name: "Google Maps 3D",
        description: "Photorealistic 3D Tiles",
        type: "google-3d",
    },
    {
        id: "carto-dark",
        name: "Dark Map (labels + borders)",
        description: "OSIRIS-style dark map — country borders, labels, place names",
        type: "imagery",
    },
    {
        id: "carto-light",
        name: "Light Map (labels + borders)",
        description: "Clean light map — country borders, labels, place names",
        type: "imagery",
    },
    {
        id: "bing-aerial",
        name: "Bing Maps Aerial",
        description: "High-resolution satellite imagery",
        type: "imagery",
    },
    {
        id: "bing-labels",
        name: "Bing Maps Hybrid",
        description: "Aerial with labels",
        type: "imagery",
    },
    {
        id: "bing-road",
        name: "Bing Maps Roads",
        description: "Standard road map",
        type: "imagery",
    },
    {
        id: "osm",
        name: "OpenStreetMap",
        description: "Community-driven map data",
        type: "imagery",
    },
    {
        id: "arcgis-world",
        name: "ArcGIS World Imagery",
        description: "Esri satellite tiles",
        type: "imagery",
    },
    {
        id: "blue-marble",
        name: "Blue Marble",
        description: "NASA Earth imagery",
        type: "imagery",
    }
];

export function createOsmProvider() {
    return new UrlTemplateImageryProvider({
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"]
    });
}

// Carto basemaps: free, keyless, labeled vector-raster tiles (borders, country
// + city labels, roads). "dark_all" is the OSIRIS-like dark style; "light_all"
// is the clean light style. Attribution: © OpenStreetMap, © CARTO.
function createCartoProvider(style: "dark_all" | "light_all") {
    return new UrlTemplateImageryProvider({
        url: `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
        subdomains: ["a", "b", "c", "d"],
        credit: "© OpenStreetMap contributors © CARTO",
    });
}

function createGoogleProvider(lyrs: string) {
    return new UrlTemplateImageryProvider({
        url: `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`,
        subdomains: ["0", "1", "2", "3"]
    });
}

async function tieredFallback(ionAssetId: number, googleLyrs: string) {
    // 1. Try Google XYZ tiles
    try {
        return createGoogleProvider(googleLyrs);
    } catch (googleErr) {
        console.warn("[ImageryProvider] Google tiles failed, trying Bing via Ion:", googleErr);
    }

    // 2. Try Bing via Cesium Ion (free shared token)
    try {
        return await IonImageryProvider.fromAssetId(ionAssetId);
    } catch (ionErr) {
        console.warn("[ImageryProvider] Ion/Bing failed, falling back to OSM:", ionErr);
    }

    // 3. OSM as last resort
    return createOsmProvider();
}

export async function createImageryProvider(layerId: string) {
    const bingKey = process.env.NEXT_PUBLIC_BING_MAPS_KEY;

    switch (layerId) {
        case "bing-aerial":
            if (bingKey) {
                return await BingMapsImageryProvider.fromUrl("https://dev.virtualearth.net", {
                    key: bingKey,
                    mapStyle: BingMapsStyle.AERIAL,
                });
            }
            return await tieredFallback(2, "s");

        case "bing-labels":
            if (bingKey) {
                return await BingMapsImageryProvider.fromUrl("https://dev.virtualearth.net", {
                    key: bingKey,
                    mapStyle: BingMapsStyle.AERIAL_WITH_LABELS,
                });
            }
            return await tieredFallback(3, "y");

        case "bing-road":
            if (bingKey) {
                return await BingMapsImageryProvider.fromUrl("https://dev.virtualearth.net", {
                    key: bingKey,
                    mapStyle: BingMapsStyle.ROAD,
                });
            }
            return await tieredFallback(4, "m");

        case "carto-dark":
            return createCartoProvider("dark_all");

        case "carto-light":
            return createCartoProvider("light_all");

        case "osm":
            return createOsmProvider();

        case "arcgis-world":
            return await ArcGisMapServerImageryProvider.fromUrl(
                "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
            );

        case "blue-marble":
            return await tieredFallback(3845, "s");

        default:
            return createOsmProvider();
    }
}
