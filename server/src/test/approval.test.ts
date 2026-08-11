import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  server,
  completeListing,
  registerStore,
  signInAdmin,
  testImage,
  type RegisteredStore,
} from "./helpers.js";

async function readyToSubmit(name: string, phone: string): Promise<RegisteredStore> {
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
  return store;
}

describe("submission requirements", () => {
  it("lists exactly what is missing on a fresh registration", async () => {
    const store = await registerStore("Taze", "65000101");
    const response = await store.client.get("/api/store/me/completeness").expect(200);

    expect(response.body.blockers).toEqual(
      expect.arrayContaining([
        "description",
        "address",
        "location",
        "categories",
        "cover",
        "venue_photos",
        "hours",
      ]),
    );
  });

  it("refuses to submit while anything is missing, and says what", async () => {
    const store = await registerStore("Taze", "65000102");
    const response = await store.client.post("/api/store/me/submit").expect(400);
    expect(response.body.error.details.blockers.length).toBeGreaterThan(0);
  });

  it("clears the blockers as the listing is filled in", async () => {
    const store = await readyToSubmit("Doly", "65000103");
    const response = await store.client.get("/api/store/me/completeness").expect(200);
    expect(response.body.blockers).toEqual([]);
  });

  it("requires the name in the store's primary language", async () => {
    const store = await registerStore("Ady", "65000104");
    await store.client
      .patch("/api/store/me")
      .send({ name: { en: "Only English" } })
      .expect(400);
  });

  it("accepts a name that includes the primary language", async () => {
    const store = await registerStore("Ady", "65000105");
    await store.client
      .patch("/api/store/me")
      .send({ name: { tk: "Türkmençe", en: "English too" } })
      .expect(200);
  });
});

describe("approval state machine", () => {
  it("moves draft to pending on submit", async () => {
    const store = await readyToSubmit("Alfa", "65000201");
    const response = await store.client.post("/api/store/me/submit").expect(200);
    expect(response.body.store.status).toBe("pending");
  });

  it("refuses a second submission while already pending", async () => {
    const store = await readyToSubmit("Alfa", "65000202");
    await store.client.post("/api/store/me/submit").expect(200);
    await store.client.post("/api/store/me/submit").expect(400);
  });

  it("publishes on approval and hides nothing before it", async () => {
    const store = await readyToSubmit("Alfa", "65000203");
    await store.client.post("/api/store/me/submit").expect(200);

    await request(server).get(`/api/public/stores/${store.slug}?lang=tk`).expect(404);

    const admin = await signInAdmin();
    const approved = await admin
      .post(`/api/admin/stores/${store.storeId}/approve`)
      .expect(200);
    expect(approved.body.store.status).toBe("approved");

    await request(server).get(`/api/public/stores/${store.slug}?lang=tk`).expect(200);
  });

  it("cannot approve a listing that is not awaiting review", async () => {
    const store = await readyToSubmit("Alfa", "65000204");
    const admin = await signInAdmin();
    await admin.post(`/api/admin/stores/${store.storeId}/approve`).expect(400);
  });

  it("requires a reason to reject, and lets the owner resubmit", async () => {
    const store = await readyToSubmit("Alfa", "65000205");
    await store.client.post("/api/store/me/submit").expect(200);

    const admin = await signInAdmin();
    await admin.post(`/api/admin/stores/${store.storeId}/reject`).send({}).expect(400);

    const rejected = await admin
      .post(`/api/admin/stores/${store.storeId}/reject`)
      .send({ reason: "Salgy nädogry" })
      .expect(200);
    expect(rejected.body.store.status).toBe("rejected");
    expect(rejected.body.store.rejectionReason).toBe("Salgy nädogry");

    const resubmitted = await store.client.post("/api/store/me/submit").expect(200);
    expect(resubmitted.body.store.status).toBe("pending");
    expect(resubmitted.body.store.rejectionReason).toBeNull();
  });

  it("cannot suspend a listing that was never published", async () => {
    const store = await readyToSubmit("Alfa", "65000206");
    const admin = await signInAdmin();
    await admin
      .post(`/api/admin/stores/${store.storeId}/suspend`)
      .send({ reason: "test" })
      .expect(400);
  });

  it("suspension removes it from the public site and signs the owner out", async () => {
    const store = await readyToSubmit("Alfa", "65000207");
    await store.client.post("/api/store/me/submit").expect(200);

    const admin = await signInAdmin();
    await admin.post(`/api/admin/stores/${store.storeId}/approve`).expect(200);
    await request(server).get(`/api/public/stores/${store.slug}?lang=tk`).expect(200);

    await admin
      .post(`/api/admin/stores/${store.storeId}/suspend`)
      .send({ reason: "Barlag" })
      .expect(200);

    await request(server).get(`/api/public/stores/${store.slug}?lang=tk`).expect(404);
    // The owner's live session is revoked immediately, not at expiry.
    await store.client.get("/api/store/me").expect(401);
  });

  it("reinstating republishes it", async () => {
    const store = await readyToSubmit("Alfa", "65000208");
    await store.client.post("/api/store/me/submit").expect(200);

    const admin = await signInAdmin();
    await admin.post(`/api/admin/stores/${store.storeId}/approve`).expect(200);
    await admin
      .post(`/api/admin/stores/${store.storeId}/suspend`)
      .send({ reason: "Barlag" })
      .expect(200);

    const reinstated = await admin
      .post(`/api/admin/stores/${store.storeId}/reinstate`)
      .expect(200);
    expect(reinstated.body.store.status).toBe("approved");
    await request(server).get(`/api/public/stores/${store.slug}?lang=tk`).expect(200);
  });

  it("a suspended store's owner cannot edit after signing in again", async () => {
    const store = await readyToSubmit("Alfa", "65000209");
    await store.client.post("/api/store/me/submit").expect(200);

    const admin = await signInAdmin();
    await admin.post(`/api/admin/stores/${store.storeId}/approve`).expect(200);
    await admin
      .post(`/api/admin/stores/${store.storeId}/suspend`)
      .send({ reason: "Barlag" })
      .expect(200);

    await store.client
      .post("/api/auth/store/login")
      .send({ phone: `+993${store.phone}`, password: "TestOwnerPass1!" })
      .expect(200);

    // Reading is allowed so the owner can see why; writing is not.
    await store.client.get("/api/store/me").expect(200);
    await store.client.patch("/api/store/me").send({ neighborhood: "X" }).expect(403);
  });
});

describe("admin roles", () => {
  it("stops a moderator from managing administrators", async () => {
    const moderator = await signInAdmin("mod", "moderator");
    await moderator.get("/api/admin/admins").expect(403);
    await moderator
      .post("/api/admin/admins")
      .send({ username: "x", name: "X", role: "owner", password: "Password12345" })
      .expect(403);
  });

  it("stops a moderator from deleting a store", async () => {
    const store = await registerStore("Alfa", "65000301");
    const moderator = await signInAdmin("mod", "moderator");
    await moderator.delete(`/api/admin/stores/${store.storeId}`).expect(403);
  });

  it("lets a moderator moderate", async () => {
    const store = await readyToSubmit("Alfa", "65000302");
    await store.client.post("/api/store/me/submit").expect(200);

    const moderator = await signInAdmin("mod", "moderator");
    await moderator.get("/api/admin/stats").expect(200);
    await moderator.post(`/api/admin/stores/${store.storeId}/approve`).expect(200);
  });
});
