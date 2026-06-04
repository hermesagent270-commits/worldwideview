// src/core/data/__tests__/engineManifest.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLocalEngineManifest, resetManifestCache } from '../engineManifest';

const mockFetch = vi.fn();

describe('fetchLocalEngineManifest', () => {
  beforeEach(() => {
    resetManifestCache();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WWV_LOCAL_ENGINE_URL;
  });

  it('probes port 5000 when NEXT_PUBLIC_WWV_LOCAL_ENGINE_URL is not set', async () => {
    mockFetch.mockResolvedValue({ ok: false } as Response);
    await fetchLocalEngineManifest();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(':5000/manifest'),
      expect.any(Object)
    );
  });

  it('probes the env-configured URL when NEXT_PUBLIC_WWV_LOCAL_ENGINE_URL is set', async () => {
    process.env.NEXT_PUBLIC_WWV_LOCAL_ENGINE_URL = 'http://localhost:5003';
    mockFetch.mockResolvedValue({ ok: false } as Response);
    await fetchLocalEngineManifest();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(':5003/manifest'),
      expect.any(Object)
    );
  });

  it('returns plugin list when engine responds successfully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ plugins: ['flight-tracker', 'ais-tracker'] }),
    } as Response);
    const result = await fetchLocalEngineManifest();
    expect(result).toEqual(['flight-tracker', 'ais-tracker']);
  });
});
