import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.RECORDING_SUITE_BASE_URL || "http://localhost:3000";
const dreamUrl = process.env.DREAM_URL || new URL("/dream", baseUrl).toString();
const studioUrl = process.env.STUDIO_URL || new URL("/studio", baseUrl).toString();
const handoffBaseUrl = process.env.HANDOFF_BASE_URL || baseUrl;
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const suiteOutDir = process.env.RECORDING_SUITE_OUT_DIR || path.join("recordings", "suite-runs", runStamp);
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
    label: "Dream all director lenses visual QA",
    args: ["run", "check:dream-lenses"],
    env: {
      DREAM_DEMO: "dali",
      DREAM_LENSES: "wide-water,low-skyline,isometric-atlas,close-detail",
      DREAM_URL: dreamUrl,
    },
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
  {
    label: "Recording index proof QA",
    args: ["run", "check:recording-index"],
    env: {
      RECORDING_INDEX_BASE_URL: baseUrl,
      RECORDING_INDEX_SKIP_REBUILD: "1",
    },
  },
];

async function main() {
  const startedAt = new Date().toISOString();
  const results = [];
  await mkdir(suiteOutDir, { recursive: true });

  try {
    await assertReachable("dream", dreamUrl);
    await assertReachable("studio", studioUrl);

    for (const step of steps) {
      const result = await runStep(step);
      results.push(result);
      if (result.status !== "passed") {
        throw new Error(`${step.label} failed with ${result.signal ? `signal ${result.signal}` : `exit code ${result.exitCode}`}.`);
      }
    }

    const manifest = await writeSuiteManifest({
      status: "passed",
      startedAt,
      finishedAt: new Date().toISOString(),
      results,
      failureMessage: "",
    });

    console.log(`\nRecording QA suite manifest: ${manifest.summaryPath}`);
    console.log(`Recording QA suite clip notes: ${manifest.notesPath}`);
    console.log("\nRecording QA suite passed.");
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : String(error);
    await writeSuiteManifest({
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      results,
      failureMessage,
    });
    throw error;
  }
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
  return new Promise((resolve) => {
    console.log(`\n>>> ${step.label}`);
    const startedAt = new Date().toISOString();
    const child = spawn(npmCommand, step.args, {
      env: { ...process.env, ...step.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on("error", (error) => {
      resolve({
        label: step.label,
        args: step.args,
        env: step.env,
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        exitCode: null,
        signal: "",
        outputPaths: parseOutputPaths(`${stdout}\n${stderr}`),
        error: error instanceof Error ? error.message : String(error),
      });
    });
    child.on("exit", (code, signal) => {
      const finishedAt = new Date().toISOString();
      resolve({
        label: step.label,
        args: step.args,
        env: step.env,
        status: code === 0 ? "passed" : "failed",
        startedAt,
        finishedAt,
        durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        exitCode: code,
        signal: signal || "",
        outputPaths: parseOutputPaths(`${stdout}\n${stderr}`),
        error: code === 0 ? "" : `${step.label} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
      });
    });
  });
}

async function writeSuiteManifest({ status, startedAt, finishedAt, results, failureMessage }) {
  const summaryPath = path.join(suiteOutDir, "summary.json");
  const notesPath = path.join(suiteOutDir, "clip-notes.md");
  const summary = {
    status,
    baseUrl,
    dreamUrl,
    studioUrl,
    handoffBaseUrl,
    createdAt: finishedAt,
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    outDir: suiteOutDir,
    failureMessage,
    stepCount: results.length,
    steps: results,
  };

  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(notesPath, buildClipNotes(summary));

  return { summaryPath, notesPath };
}

function parseOutputPaths(output) {
  return Array.from(new Set(
    [...output.matchAll(/recordings\/[^\s)]+/g)]
      .map((match) => match[0].replace(/[.,;:]$/, ""))
      .filter(Boolean),
  ));
}

function buildClipNotes(summary) {
  const lines = [
    "# Recording Suite Run Clip Notes",
    "",
    `Status: ${summary.status}`,
    `Created: ${summary.createdAt}`,
    `Base URL: ${summary.baseUrl}`,
    `Duration: ${Math.round(summary.durationMs / 1000)}s`,
    "",
    "## Steps",
    "",
  ];

  for (const step of summary.steps) {
    lines.push(`- ${step.status === "passed" ? "PASS" : "FAIL"} · ${step.label} · ${Math.round(step.durationMs / 1000)}s`);
    for (const outputPath of step.outputPaths) {
      lines.push(`  - ${outputPath}`);
    }
  }

  if (summary.failureMessage) {
    lines.push("", "## Failure", "", summary.failureMessage);
  }

  lines.push(
    "",
    "## Voiceover",
    "",
    "- One recording-suite command now creates product footage, walkthrough footage, bridge proof, archive index, and index QA evidence.",
    "- The suite manifest is the top-level receipt for the whole recording run.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
