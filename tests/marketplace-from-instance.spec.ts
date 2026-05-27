import { test, expect } from '@playwright/test';

/**
 * Marketplace instance auto-discovery E2E tests.
 *
 * Two test groups:
 *
 * 1. "capture side" — navigates directly to the marketplace with
 *    ?from_instance=... and verifies InstanceCapture stores it.
 *    Runs with playwright.marketplace.config.ts (no worldwideview / Docker needed).
 *
 * 2. "full flow" — opens worldwideview, clicks Browse Plugins, and verifies
 *    the marketplace receives the param. Needs the main playwright.config.ts
 *    (Docker + Postgres required for auth).
 */

const MARKETPLACE_URL = 'http://localhost:3002';
const WWV_ORIGIN = 'http://localhost:3001';
const FROM_INSTANCE_PARAM = `from_instance=${encodeURIComponent(WWV_ORIGIN)}`;

// ─── Marketplace capture side (no worldwideview auth needed) ────────────────

test.describe('InstanceCapture — marketplace receives from_instance', () => {
    test('captures valid origin, writes localStorage, cleans URL', async ({ page }) => {
        // Navigate as the marketplace would be opened by worldwideview.
        // InstanceCapture runs during React hydration (useEffect), so by the time
        // page.goto() resolves the URL may already be clean — that is correct behavior.
        await page.goto(`${MARKETPLACE_URL}/?${FROM_INSTANCE_PARAM}`);

        // Wait for InstanceCapture to write to localStorage (may already be set)
        await page.waitForFunction(
            () => localStorage.getItem('wwv_instance_url') !== null,
            { timeout: 15000 }
        );

        // localStorage has the correct origin-only value
        const stored = await page.evaluate(() => localStorage.getItem('wwv_instance_url'));
        expect(stored).toBe(WWV_ORIGIN);

        // from_instance param was stripped by history.replaceState
        expect(page.url()).not.toContain('from_instance');
    });

    test('rejects javascript: protocol and leaves localStorage empty', async ({ page }) => {
        // Clear any prior localStorage from the same origin
        await page.goto(MARKETPLACE_URL);
        await page.evaluate(() => localStorage.removeItem('wwv_instance_url'));

        await page.goto(`${MARKETPLACE_URL}/?from_instance=${encodeURIComponent('javascript:alert(1)')}`);

        // Give InstanceCapture time to run
        await page.waitForTimeout(1500);

        const stored = await page.evaluate(() => localStorage.getItem('wwv_instance_url'));
        expect(stored).toBeNull();
    });

    test('rejects self-referential origin and leaves localStorage empty', async ({ page }) => {
        await page.goto(MARKETPLACE_URL);
        await page.evaluate(() => localStorage.removeItem('wwv_instance_url'));

        // from_instance points at the marketplace itself — should be rejected
        await page.goto(`${MARKETPLACE_URL}/?from_instance=${encodeURIComponent(MARKETPLACE_URL)}`);
        await page.waitForTimeout(1500);

        const stored = await page.evaluate(() => localStorage.getItem('wwv_instance_url'));
        expect(stored).toBeNull();
    });

    test('direct navigation without param leaves localStorage unchanged', async ({ page }) => {
        await page.goto(MARKETPLACE_URL);
        await page.evaluate(() => localStorage.removeItem('wwv_instance_url'));

        await page.reload();
        await page.waitForLoadState('load');
        await page.waitForTimeout(1000);

        const stored = await page.evaluate(() => localStorage.getItem('wwv_instance_url'));
        expect(stored).toBeNull();
    });
});

// ─── Full flow (worldwideview → marketplace, requires Docker + auth) ─────────

test.describe('Full flow — Browse Plugins in worldwideview opens marketplace', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        // Skip when running with the marketplace-only config (baseURL = 3002)
        test.skip(baseURL !== WWV_ORIGIN, 'Requires worldwideview running (main config + Docker)');

        await page.goto('/');
        await page.waitForSelector('[data-testid="app-ready"]', { state: 'attached', timeout: 45000 });

        // Dismiss unverified plugin dialog if it appears
        try {
            const installBtn = page.getByRole('button', { name: /Install Selected/ });
            await installBtn.waitFor({ state: 'visible', timeout: 2000 });
            await installBtn.click();
        } catch { /* not present */ }

        // Ensure left panel is open
        const leftToggle = page.locator('[data-testid="panel-toggle-left"]');
        const isOpen = await leftToggle.evaluate((el) => el.classList.contains('panel-toggle-btn--open'));
        if (!isOpen) await leftToggle.click();
    });

    test('Browse Plugins appends from_instance and marketplace captures it', async ({ page }) => {
        // Navigate to Plugins tab
        const pluginsTab = page.locator('button.panel-tab[title="Plugins"]');
        await expect(pluginsTab).toBeVisible({ timeout: 10000 });
        await pluginsTab.click();

        const browseBtn = page.locator('[data-testid="browse-plugins-btn"]');
        await expect(browseBtn).toBeVisible({ timeout: 5000 });

        // Click and capture the popup
        const popupPromise = page.waitForEvent('popup');
        await browseBtn.click();
        const popup = await popupPromise;

        // Initial URL has from_instance
        expect(popup.url()).toContain(FROM_INSTANCE_PARAM);

        // InstanceCapture writes to localStorage
        await popup.waitForFunction(
            () => localStorage.getItem('wwv_instance_url') !== null,
            { timeout: 15000 }
        );

        const stored = await popup.evaluate(() => localStorage.getItem('wwv_instance_url'));
        expect(stored).toBe(WWV_ORIGIN);

        // URL cleaned up
        expect(popup.url()).not.toContain('from_instance');

        await popup.close();
    });
});
