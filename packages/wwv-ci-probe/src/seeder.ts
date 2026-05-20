import { Redis } from "ioredis";

export type PayloadShape = "geo-entity-array" | "items-object" | "named-collection" | "unknown";

/**
 * Polls Redis for `data:<name>:live` and validates that the seeder produced a
 * non-empty payload in one of the three accepted shapes (see
 * data-engine-architecture.md §7).
 *
 * @returns true if a valid payload arrived within the timeout; false otherwise.
 */
export async function probeSeeder(opts: {
  name: string;
  redisUrl: string;
  timeoutMs: number;
}): Promise<boolean> {
  const redis = new Redis(opts.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const key = `data:${opts.name}:live`;
  const deadline = Date.now() + opts.timeoutMs;
  const pollIntervalMs = 1000;

  try {
    await redis.connect();
  } catch (err) {
    console.error(`[seeder] cannot connect to Redis at ${opts.redisUrl}:`, err);
    return false;
  }

  console.log(`[seeder] waiting for ${key} (timeout ${opts.timeoutMs}ms)`);

  while (Date.now() < deadline) {
    const raw = await redis.get(key);
    if (raw && raw.length > 0) {
      const validation = validatePayload(raw);
      await redis.quit();
      if (!validation.ok) {
        console.error(`[seeder] payload present but invalid: ${validation.reason}`);
        return false;
      }
      console.log(`[seeder] OK — ${key} populated (shape: ${validation.shape}, bytes: ${raw.length})`);
      return true;
    }
    await sleep(pollIntervalMs);
  }

  await redis.quit();
  console.error(`[seeder] timed out — ${key} never populated within ${opts.timeoutMs}ms`);
  return false;
}

function validatePayload(raw: string): { ok: true; shape: PayloadShape } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, reason: `not valid JSON (${(err as Error).message})` };
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { ok: false, reason: "GeoEntity[] is empty" };
    return { ok: true, shape: "geo-entity-array" };
  }

  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      if (obj.items.length === 0) return { ok: false, reason: "items[] is empty" };
      return { ok: true, shape: "items-object" };
    }
    const arrayKeys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));
    if (arrayKeys.length === 1) {
      const arr = obj[arrayKeys[0]] as unknown[];
      if (arr.length === 0) return { ok: false, reason: `${arrayKeys[0]}[] is empty` };
      return { ok: true, shape: "named-collection" };
    }
    return { ok: false, reason: `payload object has no recognizable array field (keys: ${Object.keys(obj).join(", ")})` };
  }

  return { ok: false, reason: `payload is neither array nor object (typeof=${typeof parsed})` };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
