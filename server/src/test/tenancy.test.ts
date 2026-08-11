import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import {
  server,
  registerStore,
  signInAdmin,
  testImage,
  type RegisteredStore,
} from "./helpers.js";

/**
 * The question this file exists to answer: can one restaurant reach another
 * restaurant's data? Every route that takes an id is exercised with an id
 * belonging to somebody else.
 */
describe("cross-tenant access", () => {
  let alfa: RegisteredStore;
  let beta: RegisteredStore;
  let alfaSectionId: string;
  let alfaItemId: string;
  let alfaMediaId: string;

  beforeEach(async () => {
    alfa = await registerStore("Alfa", "65000001");
    beta = await registerStore("Beta", "65000002");

    const section = await alfa.client
      .post("/api/store/me/menu/sections")
      .send({ name: { tk: "Esasy" } })
      .expect(201);
    alfaSectionId = section.body.section.id;

    const item = await alfa.client
      .post("/api/store/me/menu/items")
      .send({ sectionId: alfaSectionId, name: { tk: "Nahar" }, priceMinor: 1000 })
      .expect(201);
    alfaItemId = item.body.item.id;

    const media = await alfa.client
      .post("/api/store/me/media")
      .field("kind", "gallery")
      .attach("image", testImage(), "photo.png")
      .expect(201);
    alfaMediaId = media.body.media.id;
  });

  it("gives each store only its own listing", async () => {
    const response = await beta.client.get("/api/store/me").expect(200);
    expect(response.body.store.id).toBe(beta.storeId);
    expect(response.body.store.id).not.toBe(alfa.storeId);
  });

  it("shows a store an empty menu when it has none", async () => {
    const response = await beta.client.get("/api/store/me/menu").expect(200);
    expect(response.body.sections).toEqual([]);
  });

  describe("menu items", () => {
    it("refuses to update another store's item", async () => {
      await beta.client
        .patch(`/api/store/me/menu/items/${alfaItemId}`)
        .send({ priceMinor: 1 })
        .expect(404);
    });

    it("refuses to delete another store's item", async () => {
      await beta.client
        .delete(`/api/store/me/menu/items/${alfaItemId}`)
        .expect(404);
    });

    it("refuses to create an item inside another store's section", async () => {
      await beta.client
        .post("/api/store/me/menu/items")
        .send({ sectionId: alfaSectionId, name: { tk: "Hijack" }, priceMinor: 1 })
        .expect(400);
    });

    it("refuses to move an item into another store's section", async () => {
      const own = await beta.client
        .post("/api/store/me/menu/sections")
        .send({ name: { tk: "Öz bölümi" } })
        .expect(201);
      const ownItem = await beta.client
        .post("/api/store/me/menu/items")
        .send({ sectionId: own.body.section.id, name: { tk: "Öz" }, priceMinor: 1 })
        .expect(201);

      await beta.client
        .patch(`/api/store/me/menu/items/${ownItem.body.item.id}`)
        .send({ sectionId: alfaSectionId })
        .expect(400);
    });

    it("refuses to reorder another store's items", async () => {
      await beta.client
        .put("/api/store/me/menu/items/order")
        .send({ ids: [alfaItemId] })
        .expect(400);
    });

    it("leaves the other store's data untouched after every attempt", async () => {
      const menu = await alfa.client.get("/api/store/me/menu").expect(200);
      expect(menu.body.sections).toHaveLength(1);
      expect(menu.body.sections[0].items[0].priceMinor).toBe(1000);
    });
  });

  describe("menu sections", () => {
    it("refuses to update another store's section", async () => {
      await beta.client
        .patch(`/api/store/me/menu/sections/${alfaSectionId}`)
        .send({ name: { tk: "Hijacked" } })
        .expect(404);
    });

    it("refuses to delete another store's section", async () => {
      await beta.client
        .delete(`/api/store/me/menu/sections/${alfaSectionId}`)
        .expect(404);
    });
  });

  describe("media", () => {
    it("refuses to delete another store's image", async () => {
      await beta.client.delete(`/api/store/me/media/${alfaMediaId}`).expect(404);
    });

    it("refuses to attach another store's image to its own item", async () => {
      const own = await beta.client
        .post("/api/store/me/menu/sections")
        .send({ name: { tk: "Bölüm" } })
        .expect(201);

      await beta.client
        .post("/api/store/me/menu/items")
        .send({
          sectionId: own.body.section.id,
          name: { tk: "Nahar" },
          priceMinor: 1,
          mediaId: alfaMediaId,
        })
        .expect(400);
    });

    it("refuses to reorder another store's images", async () => {
      await beta.client
        .put("/api/store/me/media/order")
        .send({ kind: "gallery", ids: [alfaMediaId] })
        .expect(400);
    });

    it("lists only its own images", async () => {
      const response = await beta.client.get("/api/store/me/media").expect(200);
      expect(response.body.media).toEqual([]);
    });
  });

  describe("admin routes", () => {
    it("refuses a store owner entirely", async () => {
      await alfa.client.get("/api/admin/stats").expect(401);
      await alfa.client.get(`/api/admin/stores/${beta.storeId}`).expect(401);
      await alfa.client.post(`/api/admin/stores/${beta.storeId}/approve`).expect(401);
    });

    it("refuses an anonymous caller", async () => {
      await request(server).get("/api/admin/stores").expect(401);
      await request(server).patch(`/api/admin/stores/${alfa.storeId}`).expect(401);
    });

    it("lets an admin reach any store", async () => {
      const admin = await signInAdmin();
      const response = await admin
        .get(`/api/admin/stores/${alfa.storeId}`)
        .expect(200);
      expect(response.body.store.id).toBe(alfa.storeId);
    });
  });

  describe("owner routes without a session", () => {
    it("refuse anonymous callers", async () => {
      await request(server).get("/api/store/me").expect(401);
      await request(server).patch("/api/store/me").send({}).expect(401);
      await request(server).get("/api/store/me/menu").expect(401);
      await request(server).get("/api/store/me/media").expect(401);
      await request(server).post("/api/store/me/submit").expect(401);
    });
  });
});

describe("private media", () => {
  it("is refused to anonymous callers and to other stores", async () => {
    const alfa = await registerStore("Alfa", "65000011");
    const beta = await registerStore("Beta", "65000012");

    const proof = await alfa.client
      .post("/api/store/me/media")
      .field("kind", "venue_proof")
      .attach("image", testImage(), "venue.png")
      .expect(201);

    const url: string = proof.body.media.url;
    expect(url).toMatch(/^\/api\/media\//);

    await request(server).get(url).expect(403);
    await beta.client.get(url).expect(403);
    await alfa.client.get(url).expect(200);

    const admin = await signInAdmin();
    await admin.get(url).expect(200);
  });

  it("cannot be reached through the public static path", async () => {
    const alfa = await registerStore("Alfa", "65000013");
    await alfa.client
      .post("/api/store/me/media")
      .field("kind", "venue_proof")
      .attach("image", testImage(), "venue.png")
      .expect(201);

    // The private subtree is not mounted; only /uploads/public is served.
    await request(server).get("/uploads/private/").expect(404);
  });
});
