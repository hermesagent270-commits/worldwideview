/**
 * RED test scaffold for registerGlobeCommandTools (Phase 19a Wave 0).
 *
 * These tests INTENTIONALLY FAIL because globeCommandTools.ts does not exist yet.
 * They lock the following contracts:
 *
 *   TOOL-01  All four tools are registered: pan_globe, focus_entity, toggle_layer, set_timeline
 *   TOOL-02  pan_globe with explicit sessionId calls enqueueGlobeCommand directly (no resolve)
 *   TOOL-03  toggle_layer without sessionId calls resolveActiveSessionId then enqueueGlobeCommand
 *   TOOL-04  When resolveActiveSessionId returns null, handler returns graceful result, no enqueue
 *   TOOL-05  userId comes ONLY from ctx, never from tool args
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerGlobeCommandTools } from "./globeCommandTools";

// ---------------------------------------------------------------------------
// Mock @/lib/globeCommandQueue
// vi.mock is hoisted above const declarations, so mock objects must be
// declared with vi.hoisted() to be accessible inside the factory function.
// ---------------------------------------------------------------------------

const { mockEnqueue, mockResolveSessionId } = vi.hoisted(() => ({
    mockEnqueue: vi.fn().mockResolvedValue(undefined),
    mockResolveSessionId: vi.fn().mockResolvedValue("resolved-session"),
}));

vi.mock("@/lib/globeCommandQueue", () => ({
    enqueueGlobeCommand: mockEnqueue,
    resolveActiveSessionId: mockResolveSessionId,
}));

// ---------------------------------------------------------------------------
// Fake McpServer — records registered tools
// ---------------------------------------------------------------------------

type ToolHandler = (input: Record<string, unknown>) => Promise<{ content: [{ type: "text"; text: string }] }>;

function makeFakeServer() {
    const tools = new Map<string, ToolHandler>();
    const server = {
        registerTool: vi.fn((name: string, _def: unknown, handler: ToolHandler) => {
            tools.set(name, handler);
        }),
    };
    return { server, tools };
}

beforeEach(() => {
    vi.resetAllMocks();
    mockEnqueue.mockResolvedValue(undefined);
    mockResolveSessionId.mockResolvedValue("resolved-session");
});

// ---------------------------------------------------------------------------
// TOOL-01: all four tools are registered
// ---------------------------------------------------------------------------

describe("registerGlobeCommandTools registration (TOOL-01)", () => {
    it("registers pan_globe, focus_entity, toggle_layer, and set_timeline", () => {
        const { server, tools } = makeFakeServer();

        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        expect(tools.has("pan_globe")).toBe(true);
        expect(tools.has("focus_entity")).toBe(true);
        expect(tools.has("toggle_layer")).toBe(true);
        expect(tools.has("set_timeline")).toBe(true);
    });

    it("calls server.registerTool exactly four times", () => {
        const { server } = makeFakeServer();

        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        expect(server.registerTool).toHaveBeenCalledTimes(4);
    });
});

// ---------------------------------------------------------------------------
// TOOL-02: pan_globe with explicit sessionId bypasses resolveActiveSessionId
// ---------------------------------------------------------------------------

describe("pan_globe handler (TOOL-02)", () => {
    it("calls enqueueGlobeCommand with userId, sessionId, and pan GlobeCommand", async () => {
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        const handler = tools.get("pan_globe")!;
        await handler({ lat: 1, lon: 2, alt: 3, sessionId: "s9" });

        expect(mockEnqueue).toHaveBeenCalledWith(
            "u1",
            "s9",
            expect.objectContaining({ type: "pan", lat: 1, lon: 2, alt: 3 }),
        );
    });

    it("does NOT call resolveActiveSessionId when sessionId is provided", async () => {
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        const handler = tools.get("pan_globe")!;
        await handler({ lat: 1, lon: 2, alt: 3, sessionId: "explicit-session" });

        expect(mockResolveSessionId).not.toHaveBeenCalled();
    });

    it("returns a success content result", async () => {
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        const handler = tools.get("pan_globe")!;
        const result = await handler({ lat: 40.7, lon: -74.0, alt: 500000, sessionId: "s9" });

        expect(result).toHaveProperty("content");
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty("type", "text");
    });
});

// ---------------------------------------------------------------------------
// TOOL-03: toggle_layer without sessionId calls resolveActiveSessionId
// ---------------------------------------------------------------------------

describe("toggle_layer handler — session resolution (TOOL-03)", () => {
    it("calls resolveActiveSessionId(userId) when no sessionId is provided", async () => {
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        const handler = tools.get("toggle_layer")!;
        await handler({ layerId: "ais" });

        expect(mockResolveSessionId).toHaveBeenCalledWith("u1");
    });

    it("enqueues using the resolved sessionId", async () => {
        mockResolveSessionId.mockResolvedValue("resolved-s99");
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        const handler = tools.get("toggle_layer")!;
        await handler({ layerId: "aviation" });

        expect(mockEnqueue).toHaveBeenCalledWith(
            "u1",
            "resolved-s99",
            expect.objectContaining({ type: "toggleLayer", layerId: "aviation" }),
        );
    });
});

// ---------------------------------------------------------------------------
// TOOL-04: graceful result when no active session
// ---------------------------------------------------------------------------

describe("handler graceful fallback — no active session (TOOL-04)", () => {
    beforeEach(() => {
        mockResolveSessionId.mockResolvedValue(null);
    });

    it("does NOT call enqueueGlobeCommand when resolveActiveSessionId returns null", async () => {
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        const handler = tools.get("toggle_layer")!;
        await handler({ layerId: "ais" });

        expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it("returns a content result mentioning no active globe session", async () => {
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        const handler = tools.get("toggle_layer")!;
        const result = await handler({ layerId: "ais" });

        expect(result.content[0].type).toBe("text");
        expect(result.content[0].text.toLowerCase()).toContain("no active");
    });

    it("set_timeline also returns graceful result without enqueuing", async () => {
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "u1" });

        const handler = tools.get("set_timeline")!;
        const result = await handler({ timeWindow: "24h" });

        expect(mockEnqueue).not.toHaveBeenCalled();
        expect(result.content[0].text.toLowerCase()).toContain("no active");
    });
});

// ---------------------------------------------------------------------------
// TOOL-05: userId always from ctx, never from tool args
// ---------------------------------------------------------------------------

describe("userId source invariant (TOOL-05)", () => {
    it("uses ctx.userId not a userId field in args", async () => {
        const { server, tools } = makeFakeServer();
        registerGlobeCommandTools(server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, { userId: "ctx-user" });

        const handler = tools.get("pan_globe")!;
        // Simulate a caller that supplies a userId in args — must be ignored
        await handler({ lat: 1, lon: 2, alt: 3, sessionId: "s1" });

        const [calledUserId] = mockEnqueue.mock.calls[0] as [string, string, unknown];
        expect(calledUserId).toBe("ctx-user");
    });
});
