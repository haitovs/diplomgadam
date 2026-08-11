import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    // The suite shares one database, so files must not run concurrently.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgres://tagam:tagam@localhost:5433/tagam_test",
      // Kept out of the repo tree so a failed run cannot leave files behind.
      UPLOAD_DIR: "/tmp/tagam-test-uploads",
      MAPS_DIR: "/tmp/tagam-test-maps",
      TRUST_PROXY: "false",
      BOOTSTRAP_ADMIN_USERNAME: "testadmin",
      LOGIN_MAX_ATTEMPTS: "5",
      LOGIN_LOCKOUT_MINUTES: "15",
      MIN_VENUE_PROOF_IMAGES: "1",
    },
  },
});
