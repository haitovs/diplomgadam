import { expect, test } from "@playwright/test";

/**
 * The route split, which is easy to get wrong in a way nothing else notices.
 *
 * A lazily loaded route that fails to resolve renders a spinner for ever, and
 * a build that quietly puts MapLibre back into the entry chunk undoes the
 * split without breaking anything visibly. Both are silent regressions, so
 * they are asserted rather than assumed.
 */

test("the first page does not download the map", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script") scripts.push(r.url());
  });

  await page.goto("/");
  await expect(page.locator("article").first()).toBeVisible();
  await page.waitForLoadState("networkidle");

  const map = scripts.filter((url) => /MapView|maplibre/i.test(url));
  expect(
    map,
    "MapLibre was downloaded on the discover page, so the route split has regressed",
  ).toEqual([]);
});

test("opening the map fetches it, and the route resolves", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script") scripts.push(r.url());
  });

  await page.goto("/");
  await expect(page.locator("article").first()).toBeVisible();

  await page.getByRole("link", { name: /map|karta|карт/i }).first().click();
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();

  expect(scripts.some((url) => /MapView|maplibre/i.test(url))).toBe(true);
});

test("every lazily loaded area actually renders", async ({ page }) => {
  // A chunk that 404s leaves the fallback spinner on screen indefinitely, and
  // the only symptom is a page that never arrives. Walk each split point.
  for (const [path, expected] of [
    ["/store", /sign in|gir|вход|register|hasaba|регистр/i],
    ["/admin/login", /sign in|gir|вход/i],
    ["/favorites", /favou?rite|halan|избранн/i],
  ] as const) {
    await page.goto(path);
    await expect(
      page.getByText(expected).first(),
      `${path} did not finish loading`,
    ).toBeVisible();
  }
});

test("an unknown address shows the not-found page rather than a blank screen", async ({
  page,
}) => {
  await page.goto("/definitely-not-a-page");
  await expect(page.getByText(/404|not found|tapylmady|не найден/i).first()).toBeVisible();
});
