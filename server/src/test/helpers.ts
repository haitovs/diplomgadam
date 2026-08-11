import { createServer } from "node:http";
import zlib from "node:zlib";
import request from "supertest";
import type TestAgent from "supertest/lib/agent.js";
import { createApp } from "../app.js";
import { ensureDefaultCategories } from "../auth/bootstrap.js";
import { hashPassword } from "../auth/password.js";
import { db } from "../db/client.js";
import { admins, type AdminRole } from "../db/schema.js";

/**
 * One server for the whole suite.
 *
 * Handing an Express app straight to supertest makes it start a fresh
 * ephemeral server for every single request, and with dozens of requests in
 * flight the reused sockets occasionally cross, surfacing as
 * "Parse Error: Expected HTTP/". Passing a server instead means supertest
 * starts it once and reuses it.
 */
export const server = createServer(createApp());

export const OWNER_PASSWORD = "TestOwnerPass1!";
export const ADMIN_PASSWORD = "TestAdminPass1!";

/** A supertest agent keeps cookies between requests, like a browser. */
export const agent = (): TestAgent => request.agent(server);

export async function createAdmin(
  username = "admin",
  role: AdminRole = "owner",
): Promise<string> {
  const [row] = await db
    .insert(admins)
    .values({
      username,
      name: username,
      role,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      mustChangePassword: false,
    })
    .returning({ id: admins.id });
  return row.id;
}

export async function signInAdmin(
  username = "admin",
  role: AdminRole = "owner",
): Promise<TestAgent> {
  await createAdmin(username, role);
  const client = agent();
  await client
    .post("/api/auth/admin/login")
    .send({ username, password: ADMIN_PASSWORD })
    .expect(200);
  return client;
}

export interface RegisteredStore {
  client: TestAgent;
  storeId: string;
  slug: string;
  phone: string;
}

/** Registers a store and returns an agent already signed in as its owner. */
export async function registerStore(
  name: string,
  phone: string,
): Promise<RegisteredStore> {
  const client = agent();
  const response = await client
    .post("/api/store/register")
    .send({
      owner: { fullName: `${name} Owner`, phone, password: OWNER_PASSWORD },
      store: { name: { tk: name }, primaryLang: "tk", phone: "12000000" },
    })
    .expect(201);

  return {
    client,
    storeId: response.body.store.id,
    slug: response.body.store.slug,
    phone,
  };
}

/**
 * Fills in everything a listing needs to be submitted, except the images that
 * an individual test wants to control.
 */
export async function completeListing(store: RegisteredStore): Promise<void> {
  await ensureDefaultCategories();

  await store.client
    .patch("/api/store/me")
    .send({
      description: { tk: "Beýany" },
      address: { tk: "Salgy 1" },
      lat: 37.95,
      lng: 58.38,
    })
    .expect(200);

  const allCategories = await request(server)
    .get("/api/public/categories?lang=tk")
    .expect(200);

  await store.client
    .put("/api/store/me/categories")
    .send({ categoryIds: [allCategories.body.categories[0].id] })
    .expect(200);

  await store.client
    .put("/api/store/me/hours")
    .send({
      hours: [{ weekday: 0, isClosed: false, opens: "09:00", closes: "22:00" }],
    })
    .expect(200);
}

/** A small valid PNG, generated so tests need no fixture files on disk. */
export function testImage(): Buffer {
  const width = 300;
  const height = 300;

  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour

  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x += 1) {
      row[1 + x * 3] = (x * 255) / width;
      row[2 + x * 3] = 120;
      row[3 + x * 3] = 200;
    }
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
