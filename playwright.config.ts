import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 45_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["camera"],
        launchOptions: {
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        },
      },
    },
  ],
  webServer: [
    {
      // El backend lo levanta y apaga Playwright; el :3001 queda libre antes de arrancar.
      command: "npm run dev",
      cwd: path.resolve(__dirname, "../backend"),
      url: "http://localhost:3001/api/dashboard/stats",
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      // El frontend ya puede estar corriendo (sesión de desarrollo del usuario en :3000);
      // en ese caso Playwright solo lo reutiliza y no lo toca al terminar.
      command: "npm run dev",
      cwd: __dirname,
      url: "http://localhost:3000/login",
      timeout: 60_000,
      reuseExistingServer: true,
    },
  ],
})
