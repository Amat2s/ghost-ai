import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: "proj_YOUR_PROJECT_REF", // Replace with your project ref from cloud.trigger.dev
  dirs: ["./trigger"],
  maxDuration: 3600,
  runtime: "node",
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    }
  }
});
