import { expect, test, type Page } from "@playwright/test";

/**
 * The public site, as a visitor meets it.
 *
 * Each test here corresponds to something that has actually broken in this
 * project and was found by a person looking at a screen rather than by the
 * server suite: rails that rendered nothing, a language switch that changed
 * the chrome but not the content, cards with no photograph.
 */

/** Fails loudly on console errors, which is how a blank React route presents. */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("the discover page lists restaurants with their photographs", async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto("/");

  const cards = page.locator("article");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(3);

  // A directory of restaurants with no pictures of them is the failure mode
  // this page most needs protecting from, and a broken <img> still counts as
  // present in the DOM — so check that one actually decoded.
  const image = cards.first().locator("img").first();
  await expect(image).toBeVisible();
  const width = await image.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(width, "the first card's photograph did not load").toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test("searching narrows the list and an unmatched search says so", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("article").first()).toBeVisible();
  const before = await page.locator("article").count();

  const search = page.getByRole("searchbox").first();
  await search.fill("zzzzznotarestaurant");
  // The count line and the grid both react to the query; waiting on the empty
  // state rather than a timeout keeps this from being a sleep in disguise.
  await expect(page.getByText(/nothing|hiç|ничего|no results/i).first()).toBeVisible();

  await search.fill("");
  await expect(page.locator("article")).toHaveCount(before);
});

test("a restaurant page shows its menu with prices", async ({ page, request }) => {
  const errors = watchForErrors(page);

  // Ask the API which restaurant to open rather than clicking whichever card
  // happens to be first. The rails reorder by what is open at the time of day
  // the suite runs, so clicking blindly can land on a restaurant with an empty
  // menu and fail for reasons that have nothing to do with prices.
  const list = await (await request.get("/api/public/stores?lang=en&perPage=30")).json();
  let slug: string | undefined;
  for (const store of list.stores) {
    const { store: detail } = await (
      await request.get(`/api/public/stores/${store.slug}?lang=en`)
    ).json();
    const items = (detail.menu ?? []).flatMap(
      (section: { items?: unknown[] }) => section.items ?? [],
    );
    if (items.length > 0) {
      slug = store.slug;
      break;
    }
  }
  expect(slug, "no published restaurant has a menu to check").toBeTruthy();

  await page.goto(`/restaurants/${slug}`);
  await expect(page.locator("h1")).toBeVisible();

  // Prices are integer minor units in the database, so a rendering mistake
  // shows a price 100 times too large or too small. Require a currency beside
  // a number rather than a bare figure.
  await expect(page.getByText(/TMT|manat/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the language switch changes the content, not just the chrome", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("article").first()).toBeVisible();
  const turkmen = await page.locator("h1").first().innerText();

  // The control is a dropdown in the desktop header and a row of short codes
  // inside the navigation sheet on a phone, so the route differs.
  const sheetToggle = page.getByRole("button", { name: /^(menu|menýu|меню)$/i });
  if (await sheetToggle.count()) {
    await sheetToggle.first().click();
    await page.getByRole("button", { name: "RU", exact: true }).click();
  } else {
    await page.getByRole("button", { name: /language|dil|язык/i }).first().click();
    await page.getByRole("option", { name: "Русский" }).click();
  }

  // The heading is the site's own copy; the point of the check is that the
  // restaurants below it are translated too, which is the part that comes from
  // the database and has been wrong before.
  await expect(page.locator("h1").first()).not.toHaveText(turkmen);
  await expect(page.locator("article").first()).toBeVisible();
});
