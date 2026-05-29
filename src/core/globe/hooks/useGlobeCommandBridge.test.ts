/**
 * RED test scaffold for useGlobeCommandBridge (Phase 19a Wave 0).
 *
 * These tests INTENTIONALLY FAIL because useGlobeCommandBridge.ts does not exist yet.
 * They lock the following contracts:
 *
 *   BRIDGE-01  Polls GET /api/globe/commands?sessionId=... every ~1500ms
 *   BRIDGE-02  pan command dispatches dataBus.emit("cameraGoTo", {lat,lon,alt,...})
 *   BRIDGE-03  toggleLayer command calls the Zustand setLayerEnabled action
 *   BRIDGE-04  Invalid/garbage command dispatches nothing
 *   BRIDGE-05  Empty sessionId never polls
 *   BRIDGE-06  Unmounting stops further polling
 *   BRIDGE-07  Rejected fetch does not throw
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGlobeCommandBridge } from "./useGlobeCommandBridge";

// ---------------------------------------------------------------------------
// Mock DataBus — confirm real import path from useCameraActions.ts: @/core/data/DataBus
// vi.mock factories are hoisted above variable declarations, so mock fns must
// be declared via vi.hoisted() to avoid TDZ reference errors.
// ---------------------------------------------------------------------------

const { mockEmit } = vi.hoisted(() => ({
    mockEmit: vi.fn(),
}));

vi.mock("@/core/data/DataBus", () => ({
    dataBus: {
        emit: mockEmit,
    },
}));

// ---------------------------------------------------------------------------
// Mock Zustand store — @/core/state/store
// ---------------------------------------------------------------------------

const {
    mockSetLayerEnabled,
    mockToggleLayer,
    mockSetTimeWindow,
    mockSetPlaybackMode,
    mockSetCurrentTime,
} = vi.hoisted(() => ({
    mockSetLayerEnabled: vi.fn(),
    mockToggleLayer: vi.fn(),
    mockSetTimeWindow: vi.fn(),
    mockSetPlaybackMode: vi.fn(),
    mockSetCurrentTime: vi.fn(),
}));

vi.mock("@/core/state/store", () => ({
    useStore: {
        getState: vi.fn(() => ({
            setLayerEnabled: mockSetLayerEnabled,
            toggleLayer: mockToggleLayer,
            setTimeWindow: mockSetTimeWindow,
            setPlaybackMode: mockSetPlaybackMode,
            setCurrentTime: mockSetCurrentTime,
            layers: {},
        })),
        subscribe: vi.fn(() => () => undefined),
    },
}));

// ---------------------------------------------------------------------------
// Import mocked store to restore getState after vi.resetAllMocks()
// ---------------------------------------------------------------------------

import { useStore } from "@/core/state/store";

const mockedUseStore = useStore as unknown as {
    getState: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();

    // Re-attach getState return value after reset wipes call history
    mockedUseStore.getState.mockReturnValue({
        setLayerEnabled: mockSetLayerEnabled,
        toggleLayer: mockToggleLayer,
        setTimeWindow: mockSetTimeWindow,
        setPlaybackMode: mockSetPlaybackMode,
        setCurrentTime: mockSetCurrentTime,
        layers: {},
    });

    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ commands: [] }),
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// BRIDGE-01: polls the correct endpoint
// ---------------------------------------------------------------------------

describe("useGlobeCommandBridge polling (BRIDGE-01)", () => {
    it("polls GET /api/globe/commands?sessionId=sess-1 after the poll interval", async () => {
        renderHook(() => useGlobeCommandBridge("sess-1"));

        await act(async () => {
            vi.advanceTimersByTime(1600);
        });

        expect(global.fetch).toHaveBeenCalled();
        const [[url]] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [[string]];
        expect(url).toContain("/api/globe/commands");
        expect(url).toContain("sessionId=sess-1");
    });

    it("polls repeatedly at the configured interval", async () => {
        renderHook(() => useGlobeCommandBridge("sess-1"));

        await act(async () => {
            // advanceTimersByTimeAsync flushes microtasks between each timer tick so
            // the inFlightRef guard resets before the next interval fires.
            await vi.advanceTimersByTimeAsync(4600); // ~3 intervals at 1500ms
        });

        expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
});

// ---------------------------------------------------------------------------
// BRIDGE-02: pan command dispatches dataBus.emit("cameraGoTo", ...)
// ---------------------------------------------------------------------------

describe("useGlobeCommandBridge pan dispatch (BRIDGE-02)", () => {
    it("emits cameraGoTo with lat, lon, alt when a pan command is returned", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                commands: [{ type: "pan", lat: 1, lon: 2, alt: 3 }],
            }),
        });

        renderHook(() => useGlobeCommandBridge("sess-1"));

        await act(async () => {
            vi.advanceTimersByTime(1600);
        });

        expect(mockEmit).toHaveBeenCalledWith(
            "cameraGoTo",
            expect.objectContaining({ lat: 1, lon: 2, alt: 3 }),
        );
    });
});

// ---------------------------------------------------------------------------
// BRIDGE-03: toggleLayer command calls Zustand setLayerEnabled
// ---------------------------------------------------------------------------

describe("useGlobeCommandBridge toggleLayer dispatch (BRIDGE-03)", () => {
    it("calls setLayerEnabled or toggleLayer when a toggleLayer command arrives", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                commands: [{ type: "toggleLayer", layerId: "ais" }],
            }),
        });

        renderHook(() => useGlobeCommandBridge("sess-1"));

        await act(async () => {
            vi.advanceTimersByTime(1600);
        });

        // Either toggleLayer or setLayerEnabled must be called for the layerId
        const anyLayerAction =
            mockSetLayerEnabled.mock.calls.length > 0 ||
            mockToggleLayer.mock.calls.length > 0;
        expect(anyLayerAction).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// BRIDGE-04: invalid/garbage command dispatches nothing
// ---------------------------------------------------------------------------

describe("useGlobeCommandBridge invalid command filtering (BRIDGE-04)", () => {
    it("does not call emit or any store action for an unknown command type", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                commands: [{ type: "invalidCommand", foo: "bar" }],
            }),
        });

        renderHook(() => useGlobeCommandBridge("sess-1"));

        await act(async () => {
            vi.advanceTimersByTime(1600);
        });

        expect(mockEmit).not.toHaveBeenCalled();
        expect(mockSetLayerEnabled).not.toHaveBeenCalled();
        expect(mockToggleLayer).not.toHaveBeenCalled();
        expect(mockSetTimeWindow).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// BRIDGE-05: empty sessionId never polls
// ---------------------------------------------------------------------------

describe("useGlobeCommandBridge empty sessionId no-op (BRIDGE-05)", () => {
    it("never calls fetch when sessionId is empty string", async () => {
        renderHook(() => useGlobeCommandBridge(""));

        await act(async () => {
            vi.advanceTimersByTime(10_000);
        });

        expect(global.fetch).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// BRIDGE-06: unmounting stops polling
// ---------------------------------------------------------------------------

describe("useGlobeCommandBridge unmount cleanup (BRIDGE-06)", () => {
    it("stops polling after unmount", async () => {
        const { unmount } = renderHook(() => useGlobeCommandBridge("sess-1"));

        await act(async () => {
            vi.advanceTimersByTime(1600);
        });

        const countBeforeUnmount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
        expect(countBeforeUnmount).toBeGreaterThanOrEqual(1);

        unmount();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });

        const countAfterUnmount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
        expect(countAfterUnmount).toBe(countBeforeUnmount);
    });
});

// ---------------------------------------------------------------------------
// BRIDGE-07: rejected fetch does not throw
// ---------------------------------------------------------------------------

describe("useGlobeCommandBridge fetch error resilience (BRIDGE-07)", () => {
    it("does not throw when fetch rejects", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

        // renderHook would throw if the hook propagates the error
        renderHook(() => useGlobeCommandBridge("sess-1"));

        await act(async () => {
            vi.advanceTimersByTime(1600);
        });
        // No assertion needed — reaching here means no unhandled throw
    });

    it("does not throw when fetch returns a non-ok response", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            json: vi.fn().mockResolvedValue({}),
        });

        renderHook(() => useGlobeCommandBridge("sess-1"));

        await act(async () => {
            vi.advanceTimersByTime(1600);
        });
    });
});
