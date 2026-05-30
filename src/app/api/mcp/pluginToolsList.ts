/**
 * @file pluginToolsList.ts
 * @description Dynamic tools/list composition helper (Phase 21 Wave 2 -- PLUG-04).
 *
 * composePluginToolsList merges the static system tools (Phases 19a + 20) with
 * the per-session namespaced plugin tools from the browser-published catalog.
 *
 * Design:
 *   - System tools are always present; plugin tools are appended after them.
 *   - Plugin tool names are already namespaced ({pluginId}__{name}) in the catalog.
 *   - Duplicate namespaced names across catalog entries are de-duplicated
 *     (first occurrence wins).
 *   - Each plugin tool description is augmented with a capability-coverage sentence
 *     derived from its mcpCapabilities array (REPLAN decision 5).
 *   - No DB / tenantId enumeration -- discovery is browser-published only.
 *   - No any, no ts-ignore.
 */

import type { SessionCatalog, CatalogTool } from "@/lib/mcpSessionCatalog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single tool entry in the composed tools/list output. */
export interface ComposedToolEntry {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Static system tools (Phases 19a + 20)
// ---------------------------------------------------------------------------

/**
 * System tool definitions that are always included in tools/list.
 * These mirror the tools registered by registerGlobeCommandTools (19a) and
 * registerDataQueryTools (20) so the composition helper does not need to
 * re-execute the registrar functions.
 *
 * Descriptions are intentionally brief -- the MCP client can call the tool
 * with a sessionId to get full parameter docs from the registrar's inputSchema.
 */
const SYSTEM_TOOLS: ComposedToolEntry[] = [
    // Globe command tools (19a)
    {
        name: "pan_globe",
        description: "Fly the globe camera to a geographic position. Provide lat/lon/alt (metres). Optional heading, pitch, and animation duration.",
        inputSchema: {
            type: "object",
            properties: {
                lat: { type: "number" },
                lon: { type: "number" },
                alt: { type: "number" },
                heading: { type: "number" },
                pitch: { type: "number" },
                duration: { type: "number" },
                sessionId: { type: "string" },
            },
            required: ["lat", "lon", "alt"],
        },
    },
    {
        name: "focus_entity",
        description: "Point the globe camera at a geographic coordinate or entity.",
        inputSchema: {
            type: "object",
            properties: {
                entityId: { type: "string" },
                lat: { type: "number" },
                lon: { type: "number" },
                sessionId: { type: "string" },
            },
        },
    },
    {
        name: "toggle_layer",
        description: "Enable or disable a plugin data layer on the globe.",
        inputSchema: {
            type: "object",
            properties: {
                layerId: { type: "string" },
                enabled: { type: "boolean" },
                sessionId: { type: "string" },
            },
            required: ["layerId"],
        },
    },
    {
        name: "set_timeline",
        description: "Set the globe timeline position, time window, or playback mode.",
        inputSchema: {
            type: "object",
            properties: {
                currentTime: { type: "string" },
                timeWindow: { type: "string" },
                isPlaybackMode: { type: "boolean" },
                sessionId: { type: "string" },
            },
        },
    },
    // Data query tools (20)
    {
        name: "search_entities",
        description: "Search for geospatial entities by name across active plugins.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string" },
                pluginId: { type: "string" },
                limit: { type: "number" },
            },
            required: ["query"],
        },
    },
    {
        name: "get_entities_in_region",
        description: "Find entities within a geographic bounding box.",
        inputSchema: {
            type: "object",
            properties: {
                north: { type: "number" },
                south: { type: "number" },
                east: { type: "number" },
                west: { type: "number" },
                pluginId: { type: "string" },
            },
            required: ["north", "south", "east", "west"],
        },
    },
    {
        name: "get_entity_details",
        description: "Retrieve full details for a single entity by pluginId and entityId.",
        inputSchema: {
            type: "object",
            properties: {
                pluginId: { type: "string" },
                entityId: { type: "string" },
            },
            required: ["pluginId", "entityId"],
        },
    },
    {
        name: "get_plugin_data",
        description: "Retrieve the full entity snapshot for a named plugin.",
        inputSchema: {
            type: "object",
            properties: {
                pluginId: { type: "string" },
                limit: { type: "number" },
            },
            required: ["pluginId"],
        },
    },
];

// ---------------------------------------------------------------------------
// Capability-coverage copy helper
// ---------------------------------------------------------------------------

/**
 * Appends a capability-coverage sentence to a plugin tool description.
 * Example output: "Decodes an aviation squawk code. Capabilities: point-layer, aviation-data."
 */
function withCapabilityCopy(description: string, capabilities: string[]): string {
    if (!capabilities || capabilities.length === 0) return description;
    return `${description} Capabilities: ${capabilities.join(", ")}.`;
}

// ---------------------------------------------------------------------------
// composePluginToolsList
// ---------------------------------------------------------------------------

/**
 * Compose the tools/list response from system tools plus per-session plugin tools.
 *
 * @param sessionCatalog - The per-session catalog from Redis, or null/undefined if
 *                         no session is active or no catalog has been published.
 * @returns Ordered array: system tools first, then unique namespaced plugin tools.
 */
export function composePluginToolsList(
    sessionCatalog: SessionCatalog | null | undefined,
): ComposedToolEntry[] {
    // Start with a copy of system tools (always present)
    const result: ComposedToolEntry[] = SYSTEM_TOOLS.map((t) => ({ ...t }));

    if (!sessionCatalog || !Array.isArray(sessionCatalog.tools) || sessionCatalog.tools.length === 0) {
        return result;
    }

    // De-duplicate by namespaced name; first occurrence wins.
    const seen = new Set<string>(result.map((t) => t.name));

    for (const catalogTool of sessionCatalog.tools as CatalogTool[]) {
        const name = catalogTool.namespacedName;
        if (!name || seen.has(name)) continue;

        seen.add(name);

        const capabilities = catalogTool.mcpCapabilities ?? [];
        result.push({
            name,
            description: withCapabilityCopy(catalogTool.description, capabilities),
            inputSchema: catalogTool.inputSchema ?? {},
        });
    }

    return result;
}
