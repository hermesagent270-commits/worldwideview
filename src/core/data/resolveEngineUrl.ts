// src/core/data/resolveEngineUrl.ts
import { pluginManager } from "@/core/plugins/PluginManager";
import { localEngineHasPlugin } from "./engineManifest";

const CLOUD_ENGINE_URL = "wss://dataenginev2.worldwideview.dev/stream";

const RAW_ENGINE_URL = process.env.NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL || CLOUD_ENGINE_URL;

// Upstream's hosted data engines went hard-502 (2026-06-13). Marketplace
// plugins hardcode these hosts in getServerConfig().streamUrl, which wins at
// resolution step #2 — above our NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL at
// step #4 — so every streaming layer would dial the dead upstream. When a
// self-hosted engine is configured, rewrite those dead hosts to ours,
// preserving the /stream path. Any other (live, third-party) streamUrl is
// left untouched.
const DEAD_UPSTREAM_HOSTS = [
  "dataenginev2.worldwideview.dev",
  "dataengine.worldwideview.dev",
];

function rewriteDeadUpstream(streamUrl: string): string {
  if (!process.env.NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL) return streamUrl;
  try {
    const u = new URL(streamUrl);
    if (DEAD_UPSTREAM_HOSTS.includes(u.hostname)) return DEFAULT_ENGINE_URL;
  } catch {
    // not a parseable absolute URL — leave it alone
  }
  return streamUrl;
}

/** Normalize a base URL into a valid WebSocket stream URL. */
function toWsStreamUrl(url: string): string {
  let normalized = url
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");
  if (!normalized.endsWith("/stream")) {
    normalized = `${normalized.replace(/\/+$/, "")}/stream`;
  }
  return normalized;
}

const DEFAULT_ENGINE_URL = toWsStreamUrl(RAW_ENGINE_URL);

function getLocalWsUrl() {
    const port = process.env.NEXT_PUBLIC_WWV_LOCAL_ENGINE_PORT || '5000';
    if (typeof window === "undefined") return `ws://localhost:${port}/stream`;
    return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:${port}/stream`;
}
/**
 * Resolves the WebSocket engine URL for a given plugin.
 *
 * Resolution order:
 * 1. Local engine (if running at localhost:5000 and has this plugin's seeder)
 * 2. Plugin's ServerPluginConfig.streamUrl (code-based plugins)
 * 3. Plugin's PluginManifest.dataSource.streamUrl (manifest-based plugins)
 * 4. NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL env var
 * 5. Fallback: wss://dataengine.worldwideview.dev/stream (cloud)
 */
export function resolveEngineUrl(pluginId: string): string {
  // 1. Local engine (split-routing) - PRIORITY #1
  if (localEngineHasPlugin(pluginId)) {
    return getLocalWsUrl();
  }

  // 2. Code-based plugin server config
  const managed = pluginManager.getPlugin(pluginId);
  if (managed) {
    const serverConfig = managed.plugin.getServerConfig?.();
    if (serverConfig?.streamUrl) return rewriteDeadUpstream(serverConfig.streamUrl);
  }

  // 3. Manifest-based plugin data source config
  const manifest = pluginManager.getManifest(pluginId);
  if (manifest?.dataSource?.streamUrl) return rewriteDeadUpstream(manifest.dataSource.streamUrl);

  // 4+5. Global default (env var or cloud)
  return DEFAULT_ENGINE_URL;
}
