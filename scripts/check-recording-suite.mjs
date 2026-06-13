import { spawn } from "node:child_process";

const baseUrl = process.env.RECORDING_SUITE_BASE_URL || "http://localhost:3000";
const dreamUrl = process.env.DREAM_URL || new URL("/dream", baseUrl).toString();
const studioUrl = process.env.STUDIO_URL || new URL("/studio", baseUrl).toString();
const handoffBaseUrl = process.env.HANDOFF_BASE_URL || baseUrl;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const steps = [
  {
    label: "Dream Dali visual QA",
    args: ["run", "check:dream-visuals"],
    env: { DREAM_DEMO: "dali", DREAM_URL: dreamUrl },
  },
  {
    label: "Dream coastal visual QA",
    args: ["run", "check:dream-visuals"],
    env: { DREAM_DEMO: "coast", DREAM_URL: dreamUrl },
  },
  {
    label: "Studio recording QA",
    args: ["run", "check:studio-visuals"],
    env: { STUDIO_URL: studioUrl },
  },
  {
    label: "Studio-Dream handoff QA",
    args: ["run", "check:studio-dream-handoff"],
    env: { HANDOFF_BASE_URL: handoffBaseUrl },
  },
  {
    label: "Recording asset index",
    args: ["run", "index:recording-assets"],
    env: {},
  },
];

async function main() {
  await assertReachable("dream", dreamUrl);
  await assertReachable("studio", studioUrl);

  for (const step of steps) {
    await runStep(step);
  }

  console.log("\nRecording QA suite passed.");
}

async function assertReachable(label, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Recording QA suite cannot reach ${label} page at ${url}. Start the local app first with npm run dev, or set DREAM_URL/STUDIO_URL. Detail: ${detail}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function runStep(step) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> ${step.label}`);
    const child = spawn(npmCommand, step.args, {
      env: { ...process.env, ...step.env },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${step.label} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
