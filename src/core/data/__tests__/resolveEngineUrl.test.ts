// src/core/data/__tests__/resolveEngineUrl.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../engineManifest', () => ({
  localEngineHasPlugin: vi.fn(),
}));

vi.mock('@/core/plugins/PluginManager', () => ({
  pluginManager: {
    getPlugin: vi.fn().mockReturnValue(null),
    getManifest: vi.fn().mockReturnValue(null),
  },
}));

import { resolveEngineUrl } from '../resolveEngineUrl';
import { localEngineHasPlugin } from '../engineManifest';

describe('resolveEngineUrl', () => {
  beforeEach(() => {
    vi.mocked(localEngineHasPlugin).mockReset();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_WWV_LOCAL_ENGINE_URL;
  });

  it('uses port 5000 by default when no env var is set', () => {
    vi.mocked(localEngineHasPlugin).mockReturnValue(true);
    expect(resolveEngineUrl('test-plugin')).toContain(':5000/stream');
  });

  it('uses the configured URL when NEXT_PUBLIC_WWV_LOCAL_ENGINE_URL is set', () => {
    process.env.NEXT_PUBLIC_WWV_LOCAL_ENGINE_URL = 'http://localhost:5003';
    vi.mocked(localEngineHasPlugin).mockReturnValue(true);
    expect(resolveEngineUrl('test-plugin')).toContain(':5003/stream');
  });

  it('falls back to cloud URL when local engine does not have the plugin', () => {
    vi.mocked(localEngineHasPlugin).mockReturnValue(false);
    expect(resolveEngineUrl('test-plugin')).toContain('worldwideview.dev');
  });
});
