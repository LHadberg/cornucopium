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
