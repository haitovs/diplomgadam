import request from "supertest";
import { describe, expect, it } from "vitest";
import { config } from "../config/index.js";
import {
  ADMIN_PASSWORD,
  agent,
  server,
  createAdmin,
  OWNER_PASSWORD,
  registerStore,
  signInAdmin,
} from "./helpers.js";

describe("session cookies", () => {
  it("are httpOnly so script cannot read them", async () => {
    await createAdmin();
    const response = await request(server)
      .post("/api/auth/admin/login")
      .send({ username: "admin", password: ADMIN_PASSWORD })
      .expect(200);

    const cookies = response.headers["set-cookie"] as unknown as string[];
    const session = cookies.find((c) => c.startsWith("tagam_admin="));
    expect(session).toBeDefined();
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
  });

  it("keep admin and store sessions apart", async () => {
    const store = await registerStore("Alfa", "65000401");
    // The owner's cookie must not grant admin access.
    await store.client.get("/api/auth/admin/me").expect(401);

    const admin = await signInAdmin();
    // And an admin cookie is not a store session.
    await admin.get("/api/auth/store/me").expect(401);
  });

  it("stop working after signing out", async () => {
    const admin = await signInAdmin();
    await admin.get("/api/auth/admin/me").expect(200);
    await admin.post("/api/auth/admin/logout").expect(200);
    await admin.get("/api/auth/admin/me").expect(401);
  });

  it("reject a forged token", async () => {
    await request(server)
      .get("/api/auth/admin/me")
      .set("Cookie", "tagam_admin=not-a-real-token")
      .expect(401);
  });
});

describe("sign-in", () => {
  it("gives the same answer for a wrong password and an unknown account", async () => {
    await createAdmin();

    const wrongPassword = await request(server)
      .post("/api/auth/admin/login")
      .send({ username: "admin", password: "WrongPassword123" })
      .expect(401);

    const unknownUser = await request(server)
      .post("/api/auth/admin/login")
      .send({ username: "nobody", password: "WrongPassword123" })
      .expect(401);

    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });

  it("accepts a store owner's phone in any format", async () => {
    await registerStore("Alfa", "65000402");

    for (const phone of ["65000402", "+99365000402", "993 65 000402"]) {
      await agent()
        .post("/api/auth/store/login")
        .send({ phone, password: OWNER_PASSWORD })
        .expect(200);
    }
  });

  it("locks out after too many failures and says so", async () => {
    await createAdmin();

    for (let attempt = 0; attempt < config.LOGIN_MAX_ATTEMPTS; attempt += 1) {
      await request(server)
        .post("/api/auth/admin/login")
        .send({ username: "admin", password: "WrongPassword123" })
        .expect(401);
    }

    const locked = await request(server)
      .post("/api/auth/admin/login")
      .send({ username: "admin", password: "WrongPassword123" })
      .expect(429);
    expect(locked.body.error.code).toBe("too_many_requests");

    // Even the correct password is refused while the lockout holds.
    await request(server)
      .post("/api/auth/admin/login")
      .send({ username: "admin", password: ADMIN_PASSWORD })
      .expect(429);
  });

  it("counts failures per account, not globally", async () => {
    await createAdmin("first");
    await createAdmin("second");

    for (let attempt = 0; attempt < config.LOGIN_MAX_ATTEMPTS; attempt += 1) {
      await request(server)
        .post("/api/auth/admin/login")
        .send({ username: "first", password: "WrongPassword123" })
        .expect(401);
    }

    await request(server)
      .post("/api/auth/admin/login")
      .send({ username: "second", password: ADMIN_PASSWORD })
      .expect(200);
  });
});

describe("password changes", () => {
  it("requires the current password", async () => {
    const admin = await signInAdmin();
    await admin
      .post("/api/auth/admin/change-password")
      .send({ currentPassword: "WrongPassword123", newPassword: "BrandNewPass123" })
      .expect(400);
  });

  it("refuses to reuse the same password", async () => {
    const admin = await signInAdmin();
    await admin
      .post("/api/auth/admin/change-password")
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: ADMIN_PASSWORD })
      .expect(400);
  });

  it("enforces a minimum length", async () => {
    const admin = await signInAdmin();
    await admin
      .post("/api/auth/admin/change-password")
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: "short" })
      .expect(400);
  });

  it("keeps the current session working and invalidates the others", async () => {
    await createAdmin();

    const first = agent();
    await first
      .post("/api/auth/admin/login")
      .send({ username: "admin", password: ADMIN_PASSWORD })
      .expect(200);

    const second = agent();
    await second
      .post("/api/auth/admin/login")
      .send({ username: "admin", password: ADMIN_PASSWORD })
      .expect(200);

    await first
      .post("/api/auth/admin/change-password")
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: "AnotherGoodPass1" })
      .expect(200);

    await first.get("/api/auth/admin/me").expect(200);
    await second.get("/api/auth/admin/me").expect(401);
  });
});

describe("forced password change", () => {
  it("blocks everything else until it is done", async () => {
    const admin = await signInAdmin();

    // An owner resets another admin's password; that account is then gated.
    const targetId = await createAdmin("newcomer", "moderator");
    const reset = await admin
      .post(`/api/admin/admins/${targetId}/reset-password`)
      .expect(200);

    const newcomer = agent();
    await newcomer
      .post("/api/auth/admin/login")
      .send({ username: "newcomer", password: reset.body.temporaryPassword })
      .expect(200);

    await newcomer.get("/api/admin/stats").expect(403);

    await newcomer
      .post("/api/auth/admin/change-password")
      .send({
        currentPassword: reset.body.temporaryPassword,
        newPassword: "ChosenByTheUser1",
      })
      .expect(200);

    await newcomer.get("/api/admin/stats").expect(200);
  });
});

describe("registration", () => {
  it("refuses a phone number that is already registered", async () => {
    await registerStore("Alfa", "65000501");
    const response = await request(server)
      .post("/api/store/register")
      .send({
        owner: { fullName: "Someone", phone: "65000501", password: OWNER_PASSWORD },
        store: { name: { tk: "Beta" }, primaryLang: "tk", phone: "12000000" },
      })
      .expect(409);
    expect(response.body.error.code).toBe("conflict");
  });

  it("refuses a weak password", async () => {
    await request(server)
      .post("/api/store/register")
      .send({
        owner: { fullName: "Someone", phone: "65000502", password: "short" },
        store: { name: { tk: "Beta" }, primaryLang: "tk", phone: "12000000" },
      })
      .expect(400);
  });

  it("refuses a name missing in the chosen primary language", async () => {
    await request(server)
      .post("/api/store/register")
      .send({
        owner: { fullName: "Someone", phone: "65000503", password: OWNER_PASSWORD },
        store: { name: { en: "English only" }, primaryLang: "tk", phone: "12000000" },
      })
      .expect(400);
  });

  it("gives two stores with the same name distinct slugs", async () => {
    const first = await registerStore("Meňzeş At", "65000504");
    const second = await registerStore("Meňzeş At", "65000505");
    expect(first.slug).not.toBe(second.slug);
    expect(second.slug).toMatch(/-2$/);
  });
});

describe("malformed requests", () => {
  it("answer 400 rather than 500", async () => {
    await request(server)
      .post("/api/auth/admin/login")
      .set("Content-Type", "application/json")
      .send("this is not json")
      .expect(400);
  });

  it("reject unknown fields on a strict body", async () => {
    const store = await registerStore("Alfa", "65000601");
    await store.client
      .patch("/api/store/me")
      .send({ status: "approved" })
      .expect(400);
  });
});
