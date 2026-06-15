import type { CameraAdapter, CameraFeature } from "./types";

/**
 * OSIRIS curated world city cameras — public live webcams (mostly YouTube-embed
 * iframes plus a few JPG/HLS feeds) for countries not covered by the
 * traffic-API adapters (TfL/WSDOT/Caltrans/GDOT/511NY). Ported from
 * simplifaisoul/osiris (MIT) cctv country lists, 2026-06-15. Static list — no
 * upstream API, so a long cache TTL is fine.
 */
const CAMS: ReadonlyArray<{
    lon: number; lat: number; id: string; stream: string;
    streamType: "image" | "hls" | "iframe"; name: string;
    country: string; city: string; externalUrl: string | null; origin: string;
}> = [
    {
        "lon": 23.376,
        "lat": 42.662,
        "id": "bg-sofia-tsarigradsko-uab",
        "stream": "https://cdn.uab.org/images/cctv/images/cctv/cctv_103/cctv.jpg",
        "streamType": "image",
        "name": "Tsarigradsko Shose (UAB)",
        "country": "Bulgaria",
        "city": "Sofia",
        "externalUrl": null,
        "origin": "UAB / KAMEPA"
    },
    {
        "lon": 23.327,
        "lat": 42.704,
        "id": "bg-sofia-banishora",
        "stream": "https://meteo.chavo.biz/Camera_streem/live_snap.jpg",
        "streamType": "image",
        "name": "Banishora / Opalchenska",
        "country": "Bulgaria",
        "city": "Sofia",
        "externalUrl": null,
        "origin": "meteo.chavo.biz"
    },
    {
        "lon": 27.47,
        "lat": 42.497,
        "id": "bg-burgas-center",
        "stream": "https://pics.smartburgas.eu/m3u8/burgas_town_Center.m3u8",
        "streamType": "hls",
        "name": "Burgas Center (Smart Burgas HLS)",
        "country": "Bulgaria",
        "city": "Burgas",
        "externalUrl": "https://www.weather-webcam.eu/cams/burgas-centar.html",
        "origin": "Smart Burgas"
    },
    {
        "lon": 14.4205,
        "lat": 50.0878,
        "id": "cz-prague-1",
        "stream": "https://www.youtube.com/embed/IFnbDmgP69Q?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Prague - Old Town Square",
        "country": "Czechia",
        "city": "Prague",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 14.4114,
        "lat": 50.0865,
        "id": "cz-prague-2",
        "stream": "https://www.youtube.com/embed/tmlE1ct0cYk?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Prague - Charles Bridge",
        "country": "Czechia",
        "city": "Prague",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 14.4,
        "lat": 50.09,
        "id": "cz-prague-3",
        "stream": "https://www.youtube.com/embed/sspBOJIrNzU?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Prague - City View",
        "country": "Czechia",
        "city": "Prague",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 2.2945,
        "lat": 48.8584,
        "id": "fr-paris-1",
        "stream": "https://www.youtube.com/embed/UMuEooW0iAQ?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Paris - Eiffel Tower Area",
        "country": "France",
        "city": "Paris",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 2.33,
        "lat": 48.86,
        "id": "fr-paris-2",
        "stream": "https://www.youtube.com/embed/OzYp4NRZlwQ?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Paris - Louvre Area",
        "country": "France",
        "city": "Paris",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 7.2717,
        "lat": 43.6961,
        "id": "fr-nice-1",
        "stream": "https://www.youtube.com/embed/YAdNYoRY0Cw?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Nice - Promenade des Anglais",
        "country": "France",
        "city": "Nice",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 7.26,
        "lat": 43.7,
        "id": "fr-nice-2",
        "stream": "https://www.youtube.com/embed/asO_10T0k2k?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Nice - City View",
        "country": "France",
        "city": "Nice",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 13.405,
        "lat": 52.52,
        "id": "de-berlin-1",
        "stream": "https://www.youtube.com/embed/IRqboacDNFg?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Berlin - Alexanderplatz",
        "country": "Germany",
        "city": "Berlin",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 11.582,
        "lat": 48.1351,
        "id": "de-munich-1",
        "stream": "https://www.youtube.com/embed/KxWuwC7R5kY?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Munich - Marienplatz",
        "country": "Germany",
        "city": "Munich",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 12.4922,
        "lat": 41.8902,
        "id": "it-rome-1",
        "stream": "https://www.youtube.com/embed/89d3tEaqImM?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Rome - Colosseum Area",
        "country": "Italy",
        "city": "Rome",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 9.19,
        "lat": 45.4642,
        "id": "it-milan-1",
        "stream": "https://www.youtube.com/embed/dsoM6TYIkOI?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Milan - Duomo Area",
        "country": "Italy",
        "city": "Milan",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 12.3388,
        "lat": 45.4343,
        "id": "it-venice-1",
        "stream": "https://www.youtube.com/embed/mt7uE-n0YPI?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Venice - Grand Canal",
        "country": "Italy",
        "city": "Venice",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 14.2681,
        "lat": 40.8518,
        "id": "it-naples-1",
        "stream": "https://www.youtube.com/embed/LO2Fvujwc8M?autoplay=1&mute=1",
        "streamType": "iframe",
        "name": "Naples - City View",
        "country": "Italy",
        "city": "Naples",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 139.7005,
        "lat": 35.6595,
        "id": "jp-shibuya-crossing",
        "stream": "https://www.youtube.com/embed/HpdO5Kq3o7Y?autoplay=1&mute=1",
        "streamType": "iframe",
        "name": "Shibuya Scramble Crossing",
        "country": "Japan",
        "city": "Tokyo",
        "externalUrl": null,
        "origin": "ANN News / YouTube"
    },
    {
        "lon": 139.7454,
        "lat": 35.6586,
        "id": "jp-tokyo-tower",
        "stream": "https://www.youtube.com/embed/cbJ03Xk_eLQ?autoplay=1&mute=1",
        "streamType": "iframe",
        "name": "Tokyo Tower Live Cam",
        "country": "Japan",
        "city": "Tokyo",
        "externalUrl": null,
        "origin": "YouTube"
    },
    {
        "lon": 138.7274,
        "lat": 35.3606,
        "id": "jp-mt-fuji",
        "stream": "https://www.youtube.com/embed/5aLh8R2HqOQ?autoplay=1&mute=1",
        "streamType": "iframe",
        "name": "Mt. Fuji Live",
        "country": "Japan",
        "city": "Shizuoka/Yamanashi",
        "externalUrl": null,
        "origin": "YouTube"
    },
    {
        "lon": 135.5013,
        "lat": 34.6687,
        "id": "jp-osaka-dotonbori",
        "stream": "https://www.youtube.com/embed/m6J9w94oBXY?autoplay=1&mute=1",
        "streamType": "iframe",
        "name": "Dotonbori Live Cam",
        "country": "Japan",
        "city": "Osaka",
        "externalUrl": null,
        "origin": "YouTube"
    },
    {
        "lon": 22.537,
        "lat": 42.149,
        "id": "mk-deve-bair",
        "stream": "https://streaming1.neotel.net.mk/stream/deve_bair.m3u8",
        "streamType": "hls",
        "name": "Deve Bair – Gyueshevo Border",
        "country": "North Macedonia",
        "city": "Deve Bair",
        "externalUrl": null,
        "origin": "Neotel / GKPP"
    },
    {
        "lon": 21.718,
        "lat": 42.232,
        "id": "mk-tabanovce",
        "stream": "https://streaming1.neotel.net.mk/stream/tabanovce.m3u8",
        "streamType": "hls",
        "name": "Tabanovce – Preševo Border",
        "country": "North Macedonia",
        "city": "Tabanovce",
        "externalUrl": null,
        "origin": "Neotel / GKPP"
    },
    {
        "lon": 18.6466,
        "lat": 54.352,
        "id": "pl-gdansk-1",
        "stream": "https://www.youtube.com/embed/NZ_ZiHAx8Ic?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Gdansk - City View",
        "country": "Poland",
        "city": "Gdansk",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 26.102,
        "lat": 44.426,
        "id": "ro-bucharest",
        "stream": "https://home-solutions.bg/cams/bukor.jpg",
        "streamType": "image",
        "name": "Bucharest Panorama",
        "country": "Romania",
        "city": "Bucharest",
        "externalUrl": null,
        "origin": "home-solutions.bg"
    },
    {
        "lon": 20.456,
        "lat": 44.817,
        "id": "rs-belgrade-live",
        "stream": "https://stream.uzivobeograd.rs/live/cam_7.jpg",
        "streamType": "image",
        "name": "Belgrade Live Cam",
        "country": "Serbia",
        "city": "Belgrade",
        "externalUrl": null,
        "origin": "Uzivo Beograd"
    },
    {
        "lon": 22.882,
        "lat": 42.997,
        "id": "rs-kalotina-gradina-1",
        "stream": "https://kamere.amss.org.rs/gradina1/gradina1.m3u8",
        "streamType": "hls",
        "name": "Kalotina – Gradina Border (lane 1)",
        "country": "Serbia",
        "city": "Gradina",
        "externalUrl": null,
        "origin": "AMSS / GKPP"
    },
    {
        "lon": 17.1077,
        "lat": 48.1486,
        "id": "sk-bratislava-1",
        "stream": "https://www.youtube.com/embed/kYDIwCLGKL0?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Bratislava - Old Town",
        "country": "Slovakia",
        "city": "Bratislava",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 17.1,
        "lat": 48.145,
        "id": "sk-bratislava-3",
        "stream": "https://www.youtube.com/embed/xFdvZ4eGzPg?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Bratislava - Danube River",
        "country": "Slovakia",
        "city": "Bratislava",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 2.18,
        "lat": 41.38,
        "id": "es-barcelona-2",
        "stream": "https://www.youtube.com/embed/4DjwrvoTKwk?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Barcelona - Beach Area",
        "country": "Spain",
        "city": "Barcelona",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": -3.7038,
        "lat": 40.4168,
        "id": "es-madrid-1",
        "stream": "https://www.youtube.com/embed/4CaHlfpGlAI?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Madrid - Puerta del Sol",
        "country": "Spain",
        "city": "Madrid",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": -3.7,
        "lat": 40.42,
        "id": "es-madrid-2",
        "stream": "https://www.youtube.com/embed/LSPN10FbR3U?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0",
        "streamType": "iframe",
        "name": "Madrid - Gran Via",
        "country": "Spain",
        "city": "Madrid",
        "externalUrl": null,
        "origin": "YouTube Live"
    },
    {
        "lon": 6.642,
        "lat": 46.525,
        "id": "chuv-heliport",
        "stream": "https://wc-heli.chuv.ch/axis-cgi/jpg/image.cgi?resolution=640x480",
        "streamType": "image",
        "name": "CHUV Heliport Webcam",
        "country": "Switzerland",
        "city": "Lausanne",
        "externalUrl": "https://wc-heli.chuv.ch/view/view.shtml",
        "origin": "chuv.ch"
    },
    {
        "lon": 23.8578,
        "lat": 38.0208,
        "id": "gr-aodos-cam128",
        "stream": "https://ipcamlive.com/player/player.php?alias=cam128&autoplay=1",
        "streamType": "iframe",
        "name": "I/C D. Plakentias",
        "country": "Greece",
        "city": "Athens",
        "externalUrl": null,
        "origin": "Attiki Odos"
    },
    {
        "lon": 23.7947,
        "lat": 37.9906,
        "id": "gr-aodos-cam231",
        "stream": "https://ipcamlive.com/player/player.php?alias=cam231&autoplay=1",
        "streamType": "iframe",
        "name": "I/C Papagou",
        "country": "Greece",
        "city": "Athens",
        "externalUrl": null,
        "origin": "Attiki Odos"
    }
];

export const osirisCctvAdapter: CameraAdapter = {
    id: "osiris-cctv",
    displayName: "World City Cams",
    region: "Global",
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
    async fetch(): Promise<CameraFeature[]> {
        return CAMS.map((c) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [c.lon, c.lat] },
            properties: {
                id: c.id, source: "osiris-cctv", stream: c.stream,
                streamType: c.streamType, name: c.name, country: c.country,
                city: c.city, extra: { origin: c.origin, externalUrl: c.externalUrl },
            },
        }));
    },
};
