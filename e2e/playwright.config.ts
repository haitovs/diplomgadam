import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests, run against a deployment that is already up.
 *
 * These exist for the failures the API tests cannot see. The server suite
 * proves that a request returns the right JSON; it cannot tell you that the
 * map renders no tiles, that a lazily loaded route never resolves, or that a
 * panel is transparent over satellite imagery — all of which have happened
 * here, and all of which reached a browser before anyone noticed.
 *
 *   BASE_URL=http://localhost:4080 npm run test:e2e
 *
 * Deliberately not part of `npm test`: that suite needs only PostgreSQL, and
 * this one needs a built, running stack. Keeping them separate means the fast
 * one stays fast and honest about what it covers.
 */
/*
 * Uses the Chrome already on the machine rather than Playwright's own build.
 *
 * The bundled browser is a 150 MB download, which is a poor fit for a project
 * whose entire premise is that it can be installed where large downloads are
 * unreliable. Testing against the browser people actually use is also closer
 * to the truth. Set PLAYWRIGHT_CHANNEL="" to fall back to the bundled
 * Chromium, after `npx playwright install chromium`.
 */
const CHANNEL = process.env.PLAYWRIGHT_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: ".",
  // The public site is read-only in these tests, but the owner-registration
  // spec creates data, and two workers racing on the same phone number would
  // fail for reasons that have nothing to do with the application.
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:4080",
    // Kept only for failures: passing runs should be silent, and artefacts for
    // a green run are just disk.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: CHANNEL } },
    // Most visitors here are on a phone, and the layout faults this project
    // has actually shipped were mobile ones.
    { name: "mobile", use: { ...devices["Pixel 7"], channel: CHANNEL } },
  ],
});
