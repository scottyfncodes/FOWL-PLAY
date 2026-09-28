import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __fowl: {
      store: { state: Record<string, unknown> & { chickens: unknown[]; eggs: unknown[]; corn: number; discoveredTraits: Record<string, unknown>; onboarding: string; farm: { missions: Record<string, { solvedAt: number | null; attempts: number }>; flags: string[]; clues: Record<string, string[]> } } };
      farm?: { chicken: { x: number; y: number; anim: string; onGround: boolean } };
    };
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
  await expect(page.locator('.problem-card')).toBeVisible();
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

const chickenX = (page: Page) => page.evaluate(() => window.__fowl.farm?.chicken.x ?? -1);

test('first play: welcome, breed, hatch, coop, persistence', async ({ page }) => {
  await completeWelcome(page);
  const state = () => page.evaluate(() => window.__fowl.store.state);
  expect((await state()).chickens.length).toBe(2);

  await page.click('.nav button:has-text("Breed")');
  // The welcome flow pre-selects the two founders as parents.
  await expect(page.locator('.parent-slot.filled')).toHaveCount(2);
  await page.click('.breed-cta .btn.primary');
  await expect(page.locator('.egg-slot .btn:has-text("Hatch")')).toHaveCount(1);
  expect((await state()).eggs.length).toBe(1);

  await hatchFirstEgg(page);
  const s1 = await state();
  expect(s1.chickens.length).toBe(3);
  expect(s1.eggs.length).toBe(0);
  expect(Object.keys(s1.discoveredTraits).length).toBeGreaterThan(5);
  // The reveal shows farm abilities and offers the farm.
  await expect(page.locator('.reveal .abilities')).toHaveCount(1);
  await expect(page.locator('.reveal button:has-text("Take it to the farm")')).toBeVisible();

  await page.click('.reveal .btn.primary');
  await expect(page.locator('.chicken-card')).toHaveCount(3);

  // Reload: everything persists and no welcome flow.
  await page.reload();
  await expect(page.locator('.welcome')).toHaveCount(0);
  await page.click('.nav button:has-text("Coop")');
  await expect(page.locator('.chicken-card')).toHaveCount(3);
  const s2 = await state();
  expect(s2.chickens.length).toBe(3);
  expect(s2.onboarding).toBe('done');
  expect(errors).toEqual([]);
});

test('the farm: head out, play as a chicken, solve breakfast, persist the mission', async ({ page, isMobile }) => {
  await completeWelcome(page);
  await page.click('button:has-text("Head out")');
  await expect(page.locator('.outing-row')).toHaveCount(2);
  // Every chicken shows what it can do (or says it is ordinary).
  await expect(page.locator('.outing-row .abilities')).toHaveCount(2);
  await page.click('.outing-row .btn.primary >> nth=0');
  await expect(page.locator('.farm-root canvas')).toBeVisible();
  await expect(page.locator('.farm-chip.mission')).toBeVisible();
  if (isMobile) {
    await expect(page.locator('.pad-btn.jump')).toBeVisible();
    await expect(page.locator('.pad-left')).toBeVisible();
  }
  // Walk right until the crate blocks us, hop up, peck the sack.
  const x0 = await chickenX(page);
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 60 && (await chickenX(page)) < 283; i++) await page.waitForTimeout(100);
  expect(await chickenX(page)).toBeGreaterThan(x0 + 50);
  // The first problem introduced itself on the way.
  await expect(page.locator('.farm-banner')).toContainText('Breakfast');
  await page.keyboard.down(' ');
  await page.waitForTimeout(350);
  await page.keyboard.up(' ');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(400);
  const onCrate = await page.evaluate(() => window.__fowl.farm?.chicken.y ?? 999);
  expect(onCrate).toBeLessThanOrEqual(461);
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('e');
    await page.waitForTimeout(300);
  }
  await expect(page.locator('.farm-card.complete')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('.farm-card.complete h2')).toHaveText('Breakfast served.');
  const farm = await page.evaluate(() => window.__fowl.store.state.farm);
  expect(farm.missions.breakfast?.solvedAt).toBeTruthy();

  // Keep exploring, then walk to the hedge (hopping the low fence) and learn something.
  await page.click('.farm-card button:has-text("Keep exploring")');
  await page.keyboard.down('ArrowRight');
  let lastX = await chickenX(page);
  for (let i = 0; i < 100 && lastX < 740; i++) {
    await page.waitForTimeout(120);
    const x = await chickenX(page);
    if (Math.abs(x - lastX) < 2) {
      await page.keyboard.down(' ');
      await page.waitForTimeout(300);
      await page.keyboard.up(' ');
    }
    lastX = x;
  }
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(300);
  const farm2 = await page.evaluate(() => window.__fowl.store.state.farm);
  expect(farm2.missions.gardenGate).toBeTruthy();

  // Pause and go home; the board shows the mission log and the next problem.
  await page.keyboard.press('Escape');
  await page.click('.farm-card button:has-text("Back to the coop")');
  await expect(page.locator('.farm-root')).toHaveCount(0);
  await expect(page.locator('.log-mission')).toContainText('Breakfast served.');
  await expect(page.locator('.problem-card h3')).toContainText('The Garden Gate');

  // Persistence across reload.
  await page.reload();
  await expect(page.locator('.log-mission')).toContainText('Breakfast served.');
  const farm3 = await page.evaluate(() => window.__fowl.store.state.farm);
  expect(farm3.missions.breakfast?.solvedAt).toBeTruthy();
  expect(errors).toEqual([]);
});

test('fowldex, detail modal, show and hatchery all work', async ({ page }) => {
  await completeWelcome(page);
  await page.click('.nav button:has-text("Coop")');
  await page.click('.chicken-card >> nth=0');
  await expect(page.locator('.modal .detail-hero')).toBeVisible();
  await expect(page.locator('.modal button:has-text("Take to the farm")')).toBeVisible();
  await page.click('.modal .close');

  await page.click('.nav button:has-text("Fowldex")');
  await expect(page.locator('.dex-entry:not(.locked)')).toHaveCount(2);
  await expect(page.locator('.dex-entry.locked')).toHaveCount(3);
  await page.click('.subtabs button:has-text("Abilities")');
  await expect(page.locator('.ability-card').first()).toBeVisible();
  await page.click('.subtabs button:has-text("Breeds")');
  await expect(page.locator('.breed-card')).toHaveCount(71);
  await page.click('.breed-card.locked >> nth=0');
  await expect(page.locator('.modal')).toContainText('silhouette');
  await page.click('.modal .close');
  await page.click('.subtabs button:has-text("Traits")');
  await expect(page.locator('.trait-cat').first()).toBeVisible();
  await page.click('.subtabs button:has-text("Milestones")');
  await expect(page.locator('.milestone').first()).toBeVisible();

  await page.click('.nav button:has-text("Hatchery")');
  await expect(page.locator('.offer')).toHaveCount(4);
  await page.click('.subtabs button:has-text("Chicken Show")');
  await page.click('.show-cat >> nth=4');
  await page.click('.modal .chicken-card >> nth=0');
  await expect(page.locator('.podium .score')).toBeVisible();
  await page.click('.modal .close');
  expect(errors).toEqual([]);
});

test('malformed save data does not break the game', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('fowlplay.save', '{"app":"fowl-play","version":1,"state":{"chickens":[{"id":"x","genotype":{"base":["E","zzz"]},"name":5},null,42],"corn":"nope","eggs":[{"child":null}],"farm":{"missions":"no"}}}');
  });
  await page.reload();
  await expect(page.locator('#app .header')).toBeVisible();
  const s = await page.evaluate(() => window.__fowl.store.state);
  expect(Array.isArray(s.chickens)).toBe(true);
  expect(typeof s.corn).toBe('number');
  expect(typeof s.farm.missions).toBe('object');
  expect(errors).toEqual([]);
});

test('layout has no horizontal overflow', async ({ page }) => {
  await completeWelcome(page);
  for (const tab of ['Farm', 'Coop', 'Breed', 'Fowldex', 'Hatchery']) {
    await page.click(`.nav button:has-text("${tab}")`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${tab} overflows horizontally`).toBeLessThanOrEqual(0);
  }
});
