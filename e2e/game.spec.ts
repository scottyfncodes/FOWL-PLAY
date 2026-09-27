import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __fowl: { store: { state: Record<string, unknown> & { chickens: unknown[]; eggs: unknown[]; corn: number; discoveredTraits: Record<string, unknown>; onboarding: string } } };
  }
}

const errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.text().includes('fonts.g')) errors.push(m.text());
  });
});

async function completeWelcome(page: Page) {
  await page.goto('./');
  await expect(page.locator('.welcome h1')).toHaveText('Fowl Play');
  await page.click('.welcome .btn.primary');
  await expect(page.locator('.welcome .pick')).toHaveCount(3);
  await page.click('.welcome .pick >> nth=0');
  await expect(page.locator('.parent-slot.filled')).toHaveCount(2);
}

async function hatchFirstEgg(page: Page) {
  await page.click('.egg-slot .btn:has-text("Hatch")');
  const egg = page.locator('.egg-big');
  await expect(egg).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await egg.click({ force: true });
    await page.waitForTimeout(350);
  }
  await expect(page.locator('.reveal h2')).toBeVisible({ timeout: 8000 });
}

test('first play: welcome, breed, hatch, coop, persistence', async ({ page }) => {
  await completeWelcome(page);
  const state = () => page.evaluate(() => window.__fowl.store.state);
  expect((await state()).chickens.length).toBe(2);

  await page.click('button:has-text("Breed")');
  await expect(page.locator('.egg-slot .btn:has-text("Hatch")')).toHaveCount(1);
  expect((await state()).eggs.length).toBe(1);

  await hatchFirstEgg(page);
  const s1 = await state();
  expect(s1.chickens.length).toBe(3);
  expect(s1.eggs.length).toBe(0);
  expect(Object.keys(s1.discoveredTraits).length).toBeGreaterThan(5);

  await page.click('.reveal .btn.primary');
  await expect(page.locator('.chicken-card')).toHaveCount(3);

  // Reload: everything persists and no welcome flow.
  await page.reload();
  await expect(page.locator('.welcome')).toHaveCount(0);
  await expect(page.locator('.chicken-card')).toHaveCount(3);
  const s2 = await state();
  expect(s2.chickens.length).toBe(3);
  expect(s2.onboarding).toBe('done');
  expect(errors).toEqual([]);
});

test('detail modal, almanac, show, hatchery all work', async ({ page }) => {
  await completeWelcome(page);
  await page.click('.nav button:has-text("Coop")');
  await page.click('.chicken-card >> nth=0');
  await expect(page.locator('.modal .detail-hero')).toBeVisible();
  await page.click('.modal .close');

  await page.click('.nav button:has-text("Almanac")');
  await expect(page.locator('.breed-card')).toHaveCount(71);
  await page.click('.breed-card.locked >> nth=0');
  await expect(page.locator('.modal')).toContainText('silhouette');
  await page.click('.modal .close');
  await page.click('.subtabs button:has-text("Traits")');
  await expect(page.locator('.trait-cat').first()).toBeVisible();
  await page.click('.subtabs button:has-text("Milestones")');
  await expect(page.locator('.milestone').first()).toBeVisible();

  await page.click('.nav button:has-text("Show")');
  await page.click('.show-cat >> nth=4');
  await page.click('.modal .chicken-card >> nth=0');
  await expect(page.locator('.podium .score')).toBeVisible();
  await page.click('.modal .close');

  await page.click('.nav button:has-text("Hatchery")');
  await expect(page.locator('.offer')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('malformed save data does not break the game', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('fowlplay.save', '{"app":"fowl-play","version":1,"state":{"chickens":[{"id":"x","genotype":{"base":["E","zzz"]},"name":5},null,42],"corn":"nope","eggs":[{"child":null}]}}');
  });
  await page.reload();
  await expect(page.locator('#app .header')).toBeVisible();
  const s = await page.evaluate(() => window.__fowl.store.state);
  expect(Array.isArray(s.chickens)).toBe(true);
  expect(typeof s.corn).toBe('number');
  expect(errors).toEqual([]);
});

test('layout has no horizontal overflow', async ({ page }) => {
  await completeWelcome(page);
  for (const tab of ['Coop', 'Breed', 'Hatchery', 'Almanac', 'Show']) {
    await page.click(`.nav button:has-text("${tab}")`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${tab} overflows horizontally`).toBeLessThanOrEqual(0);
  }
});
