// Must stay in sync with the TimeWindow union in @worldwideview/wwv-plugin-sdk.
export const TIME_WINDOW_VALUES = ["1h", "6h", "24h", "48h", "7d"] as const;
export type TimeWindowLiteral = (typeof TIME_WINDOW_VALUES)[number];

export type GlobeCommand =
    | { type: "pan"; lat: number; lon: number; alt: number; duration?: number; heading?: number; pitch?: number }
    | { type: "focusEntity"; entityId?: string; lat?: number; lon?: number }
    | { type: "toggleLayer"; layerId: string; enabled?: boolean }
    | { type: "setTimeline"; currentTime?: string; timeWindow?: TimeWindowLiteral; isPlaybackMode?: boolean };

function isNumber(v: unknown): v is number {
    return typeof v === "number";
}

function isString(v: unknown): v is string {
    return typeof v === "string";
}

function isOptionalNumber(v: unknown): boolean {
    return v === undefined || isNumber(v);
}

function isOptionalString(v: unknown): boolean {
    return v === undefined || isString(v);
}

function isOptionalBoolean(v: unknown): boolean {
    return v === undefined || typeof v === "boolean";
}

const TIME_WINDOW_SET = new Set<string>(TIME_WINDOW_VALUES);

function isValidTimeWindow(v: unknown): v is TimeWindowLiteral {
    return typeof v === "string" && TIME_WINDOW_SET.has(v);
}

function isOptionalTimeWindow(v: unknown): boolean {
    return v === undefined || isValidTimeWindow(v);
}

function isValidDateString(v: unknown): boolean {
    return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

function isOptionalDateString(v: unknown): boolean {
    return v === undefined || isValidDateString(v);
}

export function isValidGlobeCommand(obj: unknown): obj is GlobeCommand {
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
        return false;
    }

    const cmd = obj as Record<string, unknown>;

    switch (cmd["type"]) {
        case "pan":
            return (
                isNumber(cmd["lat"]) &&
                isNumber(cmd["lon"]) &&
                isNumber(cmd["alt"]) &&
                isOptionalNumber(cmd["duration"]) &&
                isOptionalNumber(cmd["heading"]) &&
                isOptionalNumber(cmd["pitch"])
            );

        case "focusEntity":
            return (
                isOptionalString(cmd["entityId"]) &&
                isOptionalNumber(cmd["lat"]) &&
                isOptionalNumber(cmd["lon"])
            );

        case "toggleLayer":
            return (
                isString(cmd["layerId"]) &&
                isOptionalBoolean(cmd["enabled"])
            );

        case "setTimeline":
            return (
                isOptionalDateString(cmd["currentTime"]) &&
                isOptionalTimeWindow(cmd["timeWindow"]) &&
                isOptionalBoolean(cmd["isPlaybackMode"])
            );

        default:
            return false;
    }
}
