import { describe, expect, it } from "vitest";
import {
  generateTemporaryPassword,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "./password.js";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(
      true,
    );
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("Correct horse battery staple", hash)).resolves.toBe(
      false,
    );
  });

  it("produces a different hash each time for the same password", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toBe(b);
    // Both still verify, so the difference is the salt and not a bug.
    await expect(verifyPassword("same password", a)).resolves.toBe(true);
    await expect(verifyPassword("same password", b)).resolves.toBe(true);
  });

  it("stores its parameters so they can be raised later", async () => {
    const hash = await hashPassword("whatever");
    const [scheme, N, r, p] = hash.split("$");
    expect(scheme).toBe("scrypt");
    expect(Number(N)).toBeGreaterThanOrEqual(32768);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
  });

  it("treats a hash with weaker parameters as needing a rehash", async () => {
    const current = await hashPassword("whatever");
    expect(needsRehash(current)).toBe(false);

    const [, , r, p, salt, key] = current.split("$");
    expect(needsRehash(["scrypt", 16384, r, p, salt, key].join("$"))).toBe(true);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    for (const malformed of [
      "",
      "not-a-hash",
      "scrypt$1$2$3",
      "bcrypt$32768$8$1$aaaa$bbbb",
      "scrypt$abc$8$1$aaaa$bbbb",
      "scrypt$32768$8$1$$",
    ]) {
      await expect(verifyPassword("anything", malformed)).resolves.toBe(false);
    }
  });

  it("normalises unicode so the same typed password matches", async () => {
    // "ö" as a single code point versus o + combining diaeresis.
    const composed = "paröla1234";
    const decomposed = "paröla1234";
    const hash = await hashPassword(composed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });
});

describe("temporary passwords", () => {
  it("avoids look-alike characters so it survives being read aloud", () => {
    const password = generateTemporaryPassword();
    expect(password).not.toMatch(/[0O1lI]/);
    expect(password).toMatch(/^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){3}$/);
  });

  it("does not repeat", () => {
    const generated = new Set(
      Array.from({ length: 50 }, () => generateTemporaryPassword()),
    );
    expect(generated.size).toBe(50);
  });
});
