import { expect, test } from "@playwright/test";

for (const route of ["/", "/dice-roller", "/life-tracker", "/decks", "/mtg-complete", "/hiking"]) {
  test(`guest page hydrates: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
    // Allow client effects and dynamic imports to run after initial HTML loads.
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
}

test("guest and malformed authorization cannot access protected decks", async ({ request }) => {
  for (const authorization of [undefined, "Bearer", "Bearer %%%"]) {
    const headers: Record<string, string> = authorization ? { authorization } : {};
    const session = await request.get("/api/auth/session", { headers });
    expect(session.status()).toBe(200);
    expect(await session.json()).toBeNull();
    const decks = await request.get("/api/trpc/decks.getAll", { headers });
    expect(decks.status()).toBe(401);
  }
});

test("dice physics and theme assets remain available", async ({ request }) => {
  for (const asset of ["ammo/ammo.wasm.wasm", "themes/default/theme.config.json", "themes/default/default.json"]) {
    const response = await request.get(`/assets/dice-box/${asset}`);
    expect(response.status()).toBe(200);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  }
});

test("life changes survive reload", async ({ page }) => {
  await page.goto("/life-tracker");
  const increase = page.getByRole("button", { name: "Increase Player 1 life", exact: true });
  await expect(increase).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("life-tracker-game-v1"))).not.toBeNull();
  const readLife = () => page.evaluate(() => JSON.parse(localStorage.getItem("life-tracker-game-v1") ?? "{}").players?.[0]?.life as number);
  const initial = await readLife();
  await increase.click();
  await expect.poll(readLife).toBe(initial + 1);
  await page.reload();
  await expect(increase).toBeVisible();
  await expect.poll(readLife).toBe(initial + 1);
});

test("D20 rolls and rerolls produce bounded results", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/dice-roller");
  const reroll = page.getByRole("button", { name: "Reroll", exact: true });
  await expect(reroll).toBeVisible();
  // The existing D20 icon button is the first control in the reroll footer.
  await reroll.locator("..").getByRole("button").first().click();
  const total = page.getByRole("button", { name: /^Total \d+/ });
  await expect(total).toBeEnabled({ timeout: 30000 });
  const first = Number((await total.innerText()).match(/Total (\d+)/)?.[1]);
  expect(first).toBeGreaterThanOrEqual(1);
  expect(first).toBeLessThanOrEqual(20);
  await reroll.click();
  await expect(total).toBeEnabled({ timeout: 30000 });
  const second = Number((await total.innerText()).match(/Total (\d+)/)?.[1]);
  expect(second).toBeGreaterThanOrEqual(1);
  expect(second).toBeLessThanOrEqual(20);
});
