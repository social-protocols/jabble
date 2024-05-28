import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
	await page.goto('http://localhost:8081')

	await expect(page).toHaveTitle(/Jabble/)
})
