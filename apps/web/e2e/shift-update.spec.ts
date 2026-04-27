import { expect, test } from "@playwright/test";

test.describe("Shift Update", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("http://localhost:3001/dashboard");
	});

	test("should update shift and reflect in counters", async ({ page }) => {
		await page.waitForSelector('[data-testid="roster-table"]', {
			timeout: 10000,
		});

		const firstShiftCell = page.locator('[data-testid="shift-cell"]').first();
		await firstShiftCell.click();

		await page.waitForSelector('[role="menu"]', { timeout: 5000 });
		await page.click('[role="menuitem"]:has-text("Morning")');

		await page.waitForTimeout(1000);

		const toast = page.locator("[data-sonner-toast]");
		await expect(toast).toBeVisible({ timeout: 5000 });
	});

	test("should update multiple shifts in sequence", async ({ page }) => {
		await page.waitForSelector('[data-testid="roster-table"]', {
			timeout: 10000,
		});

		const cells = page.locator('[data-testid="shift-cell"]');

		const cell1 = cells.nth(0);
		await cell1.click();
		await page.waitForSelector('[role="menu"]', { timeout: 5000 });
		await page.click('[role="menuitem"]:has-text("Morning")');
		await page.waitForTimeout(500);

		const cell2 = cells.nth(1);
		await cell2.click();
		await page.waitForSelector('[role="menu"]', { timeout: 5000 });
		await page.click('[role="menuitem"]:has-text("Evening")');
		await page.waitForTimeout(500);
	});
});
