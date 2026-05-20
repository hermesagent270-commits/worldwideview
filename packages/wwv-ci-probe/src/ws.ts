import WebSocket from "ws";

/**
 * Connects to the data-engine's /stream WebSocket and resolves when a
 * `{ type: "data", pluginId: <name>, payload: ... }` message arrives for the
 * given plugin id (see data-engine-architecture.md §7).
 *
 * Rejects with exit code 1 if no matching payload arrives within the timeout
 * — which is the signature of an ADR-0002 id mismatch or a silently-dropped
 * object payload.
 */
export async function probeWs(opts: {
  name: string;
  wsUrl: string;
  timeoutMs: number;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(opts.wsUrl);
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.error(
        `[ws] timed out — no data message with pluginId="${opts.name}" in ${opts.timeoutMs}ms ` +
          `(check ADR-0002 seeder.name vs plugin id, and that the seeder is producing data)`,
      );
      ws.terminate();
      resolve(false);
    }, opts.timeoutMs);

    ws.on("open", () => {
      console.log(`[ws] connected to ${opts.wsUrl}, waiting for pluginId="${opts.name}"`);
    });

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg?.type !== "data" || msg.pluginId !== opts.name) return;
      if (settled) return;

      const payload = msg.payload;
      const valid = isNonEmptyPayload(payload);
      if (!valid.ok) {
        console.error(`[ws] received message for "${opts.name}" but payload invalid: ${valid.reason}`);
        // Keep waiting — a later message might be valid.
        return;
      }

      settled = true;
      clearTimeout(timer);
      console.log(`[ws] OK — received valid payload for "${opts.name}" (shape: ${valid.shape})`);
      ws.close();
      resolve(true);
    });

    ws.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.error(`[ws] connection error:`, err);
      resolve(false);
    });
  });
}

function isNonEmptyPayload(p: unknown):
  | { ok: true; shape: "geo-entity-array" | "items-object" | "named-collection" }
  | { ok: false; reason: string } {
  if (Array.isArray(p)) {
    return p.length > 0
      ? { ok: true, shape: "geo-entity-array" }
      : { ok: false, reason: "empty GeoEntity[]" };
  }
  if (p && typeof p === "object") {
    const obj = p as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return obj.items.length > 0
        ? { ok: true, shape: "items-object" }
        : { ok: false, reason: "empty items[]" };
    }
    const arrayKeys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));
    if (arrayKeys.length === 1) {
      const arr = obj[arrayKeys[0]] as unknown[];
      return arr.length > 0
        ? { ok: true, shape: "named-collection" }
        : { ok: false, reason: `empty ${arrayKeys[0]}[]` };
    }
    return { ok: false, reason: "payload object has no recognizable array field" };
  }
  return { ok: false, reason: `payload is neither array nor object (typeof=${typeof p})` };
}
