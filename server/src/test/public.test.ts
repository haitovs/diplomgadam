import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ensureDefaultCategories } from "../auth/bootstrap.js";
import { db } from "../db/client.js";
import { stores } from "../db/schema.js";
import {
  completeListing,
  registerStore,
  server,
  signInAdmin,
  testImage,
  type RegisteredStore,
} from "./helpers.js";

/**
 * Fails with the server's own explanation instead of a bare status code.
 *
 * Supertest reports `expected 200, got 404` and nothing else, which for a
 * multi-step helper does not even say which step failed. A rare failure in
 * here has been seen twice and reproduced in none of twenty-two subsequent
 * runs; if it happens again this is what turns it into something diagnosable
 * rather than another unexplained flake.
 */
async function expectOk(
  step: string,
  response: request.Response,
): Promise<request.Response> {
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `${step} returned ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }
  return response;
}

/** Registers a store, fills it in, submits and approves it. */
async function publishStore(name: string, phone: string): Promise<RegisteredStore> {
  const store = await registerStore(name, phone);
  await completeListing(store);
  await store.client
    .post("/api/store/me/media")
    .field("kind", "cover")
    .attach("image", testImage(), "cover.png")
    .expect(201);
  await store.client
    .post("/api/store/me/media")
    .field("kind", "venue_proof")
    .attach("image", testImage(), "venue.png")
    .expect(201);
  await expectOk("submit", await store.client.post("/api/store/me/submit"));

  const admin = await signInAdmin(`admin-${phone}`);
  await expectOk(
    `approve ${store.storeId} (${store.slug})`,
    await admin.post(`/api/admin/stores/${store.storeId}/approve`),
  );

  // Reading it back proves the row really is approved before a test asserts on
  // the public site. Both observed failures were a 404 where this store should
  // have been visible, and this distinguishes "approval did not take" from
  // "the public query cannot see an approved row".
  const [row] = await db
    .select({ status: stores.status })
    .from(stores)
    .where(eq(stores.id, store.storeId));
  if (row?.status !== "approved") {
    throw new Error(
      `${store.slug} is "${row?.status ?? "missing"}" after a successful approve`,
    );
  }

  return store;
}

describe("public categories", () => {
  it("counts only approved stores, per category", async () => {
    await ensureDefaultCategories();

    const before = await request(server)
      .get("/api/public/categories?lang=en")
      .expect(200);
    // Nothing is published yet, so every count must be zero.
    expect(before.body.categories.every((c: { storeCount: number }) => c.storeCount === 0)).toBe(
      true,
    );

    await publishStore("Alfa", "65000701");

    const after = await request(server)
      .get("/api/public/categories?lang=en")
      .expect(200);

    const used = after.body.categories.filter(
      (c: { storeCount: number }) => c.storeCount > 0,
    );

    // This is the regression guard: a correlated subquery previously lost its
    // correlation and reported zero for every category, which looked like
    // "no data" rather than a bug.
    expect(used).toHaveLength(1);
    expect(used[0].storeCount).toBe(1);
  });

  it("stops counting a store once it is suspended", async () => {
    const store = await publishStore("Alfa", "65000702");

    const admin = await signInAdmin("suspender");
    await admin
      .post(`/api/admin/stores/${store.storeId}/suspend`)
      .send({ reason: "Barlag" })
      .expect(200);

    const response = await request(server)
      .get("/api/public/categories?lang=en")
      .expect(200);

    expect(
      response.body.categories.every((c: { storeCount: number }) => c.storeCount === 0),
    ).toBe(true);
  });

  it("returns an id for every category, which the owner portal needs", async () => {
    await ensureDefaultCategories();
    const response = await request(server)
      .get("/api/public/categories?lang=tk")
      .expect(200);

    expect(response.body.categories.length).toBeGreaterThan(0);
    for (const category of response.body.categories) {
      expect(typeof category.id).toBe("string");
      expect(category.name).toBeTruthy();
    }
  });
});

describe("public listings", () => {
  it("filters by cuisine", async () => {
    const store = await publishStore("Alfa", "65000703");

    const detail = await request(server)
      .get(`/api/public/stores/${store.slug}?lang=en`)
      .expect(200);
    const slug = detail.body.store.categories[0].slug;

    const matching = await request(server)
      .get(`/api/public/stores?lang=en&category=${slug}`)
      .expect(200);
    expect(matching.body.total).toBe(1);

    const other = await request(server)
      .get("/api/public/stores?lang=en&category=seafood")
      .expect(200);
    expect(other.body.total).toBe(0);
  });

  it("resolves a missing translation to the store's primary language", async () => {
    const store = await publishStore("Alfa", "65000704");

    // completeListing writes a Turkmen description only.
    const english = await request(server)
      .get(`/api/public/stores/${store.slug}?lang=en`)
      .expect(200);
    const turkmen = await request(server)
      .get(`/api/public/stores/${store.slug}?lang=tk`)
      .expect(200);

    expect(english.body.store.description).toBe(turkmen.body.store.description);
    expect(english.body.store.description).not.toBe("");
  });

  it("never lists a store that is not approved", async () => {
    const published = await publishStore("Alfa", "65000705");
    const draft = await registerStore("Beta", "65000706");

    const list = await request(server).get("/api/public/stores?lang=tk").expect(200);
    const slugs = list.body.stores.map((s: { slug: string }) => s.slug);

    expect(slugs).toContain(published.slug);
    expect(slugs).not.toContain(draft.slug);
  });

  it("counts a view when the detail page is read", async () => {
    const store = await publishStore("Alfa", "65000707");

    await request(server).get(`/api/public/stores/${store.slug}?lang=tk`).expect(200);
    // The counter is incremented after the response is sent, so read it from
    // the database rather than racing the next request.
    await new Promise((resolve) => setTimeout(resolve, 150));

    const [row] = await db
      .select({ views: stores.views })
      .from(stores)
      .where(eq(stores.id, store.storeId));
    expect(row.views).toBeGreaterThanOrEqual(1);
  });
});
