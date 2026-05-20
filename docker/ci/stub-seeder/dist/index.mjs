// CI-only stub seeder. Emits a known-good GeoEntity[] payload under the
// plugin id provided via STUB_PLUGIN_ID. Used by plugin-CI to isolate
// frontend wiring from real backend health.
//
// NOTE: This bypasses ADR-0002's compile-time name rule on purpose — the
// data engine reads `name` once at load time, so an env-driven name is
// fine in CI. Do NOT copy this pattern into real seeders.

const pluginId = process.env.STUB_PLUGIN_ID;
if (!pluginId) {
  console.error("[stub-seeder] STUB_PLUGIN_ID env var is required");
  process.exit(1);
}

function makeEntities() {
  const now = new Date().toISOString();
  return [
    {
      id: `${pluginId}-stub-1`,
      pluginId,
      latitude: 0,
      longitude: 0,
      altitude: 0,
      timestamp: now,
      label: "Stub entity 1",
      properties: { source: "ci-stub" },
    },
    {
      id: `${pluginId}-stub-2`,
      pluginId,
      latitude: 10,
      longitude: 10,
      altitude: 0,
      timestamp: now,
      label: "Stub entity 2",
      properties: { source: "ci-stub" },
    },
  ];
}

export default {
  name: pluginId,
  // Run immediately and every 10s — CI doesn't wait for cron schedules
  cron: "*/10 * * * * *",
  fn: async (ctx) => {
    const entities = makeEntities();
    await ctx.setLiveSnapshot(pluginId, entities, 300);
    console.log(`[stub-seeder] emitted ${entities.length} entities for ${pluginId}`);
  },
};
