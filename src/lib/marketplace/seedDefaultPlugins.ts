import { prisma } from "@/lib/db";
import { DEFAULT_PLUGIN_IDS } from "./defaultPlugins";
import { getVerifiedPluginIds } from "./registryClient";
import { upsertPlugin } from "./repository";
import { validateManifest } from "@/core/plugins/validateManifest";
import { PluginManifest } from "@worldwideview/wwv-plugin-sdk";

const MARKETPLACE_URL = process.env.NEXT_PUBLIC_MARKETPLACE_URL;

/**
 * Seeds default verified plugins into the local database on first run.
 * This ensures common layers like ISS, Aircraft, and Maritime are available immediately.
 * 
 * @returns {Promise<void>}
 */
export async function seedDefaultPlugins(): Promise<void> {
    try {
        if (process.env.WWV_SKIP_DEFAULT_PLUGINS === "true") {
            await markSeeded();
            return;
        }

        // Idempotent guard — already seeded?
        const guard = await prisma.setting.findFirst({
            where: { key: "defaults_seeded" },
        });
        if (guard) return;

        // Not truly fresh if plugins already exist
        const count = await prisma.installedPlugin.count();
        if (count > 0) {
            await markSeeded();
            return;
        }

        console.log(
            `[DefaultPlugins] Fresh install detected — seeding ${DEFAULT_PLUGIN_IDS.length} default plugins…`,
        );

        const verified = await getVerifiedPluginIds();

        for (const pluginId of DEFAULT_PLUGIN_IDS) {
            try {
                if (!pluginId) continue;

                if (!verified.has(pluginId)) {
                    // Only seed official verified plugins by default
                    continue;
                }

                const manifest = await fetchManifest(pluginId);
                if (!manifest) continue;

                const validation = validateManifest(manifest);
                if (!validation.valid) {
                    console.warn(
                        `[DefaultPlugins] Skipping ${pluginId}: ${validation.errors.join(", ")}`,
                    );
                    continue;
                }

                // Correct signature: id, version, config
                await upsertPlugin(
                    pluginId, 
                    manifest.version || "1.0.0", 
                    JSON.stringify(manifest)
                );
            } catch (err) {
                console.warn(`[DefaultPlugins] Failed to seed ${pluginId}:`, err);
            }
        }

        await markSeeded();
        console.log("[DefaultPlugins] Successfully seeded default plugins.");
    } catch (error) {
        console.error("[DefaultPlugins] Fatal error during seeding:", error);
    }
}

/**
 * Records that the seeding process has completed.
 */
async function markSeeded() {
    const existing = await prisma.setting.findFirst({
        where: { key: "defaults_seeded" }
    });
    
    if (!existing) {
        await prisma.setting.create({
            data: { key: "defaults_seeded", value: "true" }
        });
    }
}

/**
 * Fetches a plugin manifest from the official marketplace.
 */
async function fetchManifest(pluginId: string): Promise<PluginManifest> {
    try {
        const res = await fetch(`${MARKETPLACE_URL}/api/plugins/${pluginId}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch manifest for ${pluginId}: ${res.statusText}`);
        }
        return await res.json();
    } catch (err) {
        throw err;
    }
}
