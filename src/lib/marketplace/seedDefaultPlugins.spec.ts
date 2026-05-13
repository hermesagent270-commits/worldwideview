import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedDefaultPlugins } from "./seedDefaultPlugins";
import { prisma } from "@/lib/db";
import { getVerifiedPluginIds } from "./registryClient";
import { upsertPlugin } from "./repository";
import { validateManifest } from "@/core/plugins/validateManifest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
    prisma: {
        setting: {
            findFirst: vi.fn(),
            upsert: vi.fn(),
            create: vi.fn(),
        },
        installedPlugin: {
            count: vi.fn(),
        },
    },
}));

vi.mock("./registryClient", () => ({
    getVerifiedPluginIds: vi.fn(),
}));

vi.mock("./repository", () => ({
    upsertPlugin: vi.fn(),
}));

vi.mock("@/core/plugins/validateManifest", () => ({
    validateManifest: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("seedDefaultPlugins", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.WWV_SKIP_DEFAULT_PLUGINS = "false";
        process.env.NEXT_PUBLIC_MARKETPLACE_URL = "https://market.test";
        
        vi.mocked(getVerifiedPluginIds).mockResolvedValue(new Set(["aviation", "maritime"]));
        vi.mocked(validateManifest).mockReturnValue({ valid: true, errors: [] });
    });

    it("should skip if WWV_SKIP_DEFAULT_PLUGINS is true", async () => {
        process.env.WWV_SKIP_DEFAULT_PLUGINS = "true";
        await seedDefaultPlugins();
        expect(prisma.setting.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ key: "defaults_seeded" })
        }));
    });

    it("should skip if already seeded (guard found)", async () => {
        vi.mocked(prisma.setting.findFirst).mockResolvedValue({ id: 1, key: "defaults_seeded", value: "true" } as any);
        await seedDefaultPlugins();
        expect(prisma.installedPlugin.count).not.toHaveBeenCalled();
    });

    it("should skip if plugins already exist in database", async () => {
        vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.installedPlugin.count).mockResolvedValue(5);
        await seedDefaultPlugins();
        expect(getVerifiedPluginIds).not.toHaveBeenCalled();
        expect(prisma.setting.create).toHaveBeenCalled();
    });

    it("should seed verified plugins successfully", async () => {
        vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.installedPlugin.count).mockResolvedValue(0);
        
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ id: "aviation", version: "1.0.0", name: "Aviation" }),
        });

        await seedDefaultPlugins();

        expect(upsertPlugin).toHaveBeenCalledWith(
            "aviation", 
            "1.0.0", 
            expect.stringContaining('"id":"aviation"')
        );
        expect(prisma.setting.create).toHaveBeenCalled();
    });

    it("should skip unverified plugins", async () => {
        vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.installedPlugin.count).mockResolvedValue(0);
        vi.mocked(getVerifiedPluginIds).mockResolvedValue(new Set(["other"]));

        await seedDefaultPlugins();

        expect(mockFetch).not.toHaveBeenCalled();
        expect(upsertPlugin).not.toHaveBeenCalled();
    });

    it("should skip if manifest is invalid", async () => {
        vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.installedPlugin.count).mockResolvedValue(0);
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ id: "aviation" }),
        });
        vi.mocked(validateManifest).mockReturnValue({ valid: false, errors: ["bad"] });

        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await seedDefaultPlugins();

        expect(upsertPlugin).not.toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining("Skipping aviation: bad"));
        spy.mockRestore();
    });

    it("should handle individual plugin failures and continue", async () => {
        vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.installedPlugin.count).mockResolvedValue(0);
        
        // aviation fails, maritime succeeds
        mockFetch
            .mockResolvedValueOnce({ ok: false, statusText: "Not Found" }) // aviation
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "maritime", version: "2.0.0" }),
            }); // maritime

        vi.mocked(getVerifiedPluginIds).mockResolvedValue(new Set(["aviation", "maritime"]));

        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await seedDefaultPlugins();
        
        // Should NOT have called upsert for aviation
        expect(upsertPlugin).not.toHaveBeenCalledWith("aviation", expect.any(String), expect.any(String));
        
        // Should HAVE called upsert for maritime
        expect(upsertPlugin).toHaveBeenCalledWith(
            "maritime",
            "2.0.0",
            expect.any(String)
        );
        
        expect(spy).toHaveBeenCalledWith(expect.stringContaining("Failed to seed aviation"), expect.any(Error));
        spy.mockRestore();
    });

    it("should catch and log outer errors", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(prisma.setting.findFirst).mockImplementationOnce(() => {
            throw new Error("Fatal");
        });
        
        await seedDefaultPlugins();

        expect(spy).toHaveBeenCalledWith(expect.stringContaining("Fatal error during seeding"), expect.any(Error));
        spy.mockRestore();
    });
});
