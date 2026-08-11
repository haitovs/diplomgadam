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
  await store.client.post("/api/store/me/submit").expect(200);

  const admin = await signInAdmin(`admin-${phone}`);
  await admin.post(`/api/admin/stores/${store.storeId}/approve`).expect(200);
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
