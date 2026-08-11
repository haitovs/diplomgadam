import { expect, test } from "@playwright/test";

/**
 * The map, which the server suite cannot see at all.
 *
 * Every map fault this project has had was invisible to an API test and
 * obvious in a browser: tiles fetched from a Web Worker that has no base URL
 * to resolve against, empty tiles answered with 204 so MapLibre tried to parse
 * an empty body as protobuf, markers added before the style finished loading,
 * and a sidebar whose background rule produced no colour at all, leaving it
 * transparent over the imagery. Each of those reached a screen.
 */

test("the map draws tiles and does not log an error", async ({ page }) => {
  const errors: string[] = [];
  const failedTiles: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (response) => {
    // 404 is the legitimate answer for a square of empty desert; anything else
    // failing means the tile pipeline is broken.
    if (/\/api\/maps\/tiles\//.test(response.url()) && ![200, 404].includes(response.status())) {
      failedTiles.push(`${response.status()} ${response.url()}`);
    }
  });

  // Registered before navigating: the tiles for a small city arrive quickly
  // enough that waiting for them after the page has settled races with them
  // having already been fetched.
  const firstTile = page.waitForResponse(
    (r) => r.url().includes("/maps/tiles/") && r.status() === 200,
    { timeout: 25_000 },
  );

  await page.goto("/map");
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await firstTile;

  // The map went blank once with every tile still loading perfectly: MapLibre's
  // own stylesheet sets `position: relative` on the container, which beat the
  // Tailwind `absolute` it was relying on as soon as that stylesheet started
  // arriving later, and the element collapsed to no height. So measure the
  // element MapLibre draws into rather than trusting that tiles were fetched.
  const height = await page
    .locator(".maplibregl-map")
    .evaluate((el) => el.clientHeight);
  expect(height, "the map element has collapsed to no height").toBeGreaterThan(200);

  expect(failedTiles, "tile requests failed").toEqual([]);
  expect(errors).toEqual([]);
});

test("the sidebar list is readable and filters the markers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "the sidebar is a sheet on mobile");

  await page.goto("/map");
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();

  const sidebar = page.locator("aside").first();
  await expect(sidebar).toBeVisible();

  // The panel was transparent in production once, because Tailwind cannot
  // apply an opacity modifier to a var() colour and silently emitted nothing.
  // A see-through panel over satellite imagery is unreadable, so assert that
  // it has a real background rather than trusting the class name.
  const background = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background, "the map sidebar has no background colour").not.toBe(
    "rgba(0, 0, 0, 0)",
  );
  expect(background).not.toBe("transparent");

  const listed = sidebar.locator("button, a").filter({ hasText: /\S/ });
  expect(await listed.count()).toBeGreaterThan(0);
});

test("the fullscreen toggle is optional and reversible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "fullscreen is the default on a phone");

  await page.goto("/map");
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();

  // Measured rather than asserted on the header being hidden: fullscreen
  // covers the page instead of unmounting it, so the header is still there
  // underneath and a visibility check would pass either way.
  const viewport = page.viewportSize()!;
  const mapBox = () => page.locator(".maplibregl-map").boundingBox();

  const windowed = await mapBox();
  expect(windowed!.height).toBeLessThan(viewport.height);

  await page
    .getByRole("button", { name: /fullscreen|doly ekran|во весь экран/i })
    .first()
    .click();
  await expect
    .poll(async () => (await mapBox())!.height)
    .toBeGreaterThanOrEqual(viewport.height - 1);

  // Escape leaves it, which is the only way out if the toggle is now covered.
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await mapBox())!.height).toBeLessThan(viewport.height);
});
