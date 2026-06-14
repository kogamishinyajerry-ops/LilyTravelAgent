import { spawn } from "node:child_process";
import path from "node:path";

const defaultLensIds = ["auto", "wide-water", "low-skyline", "isometric-atlas", "close-detail"];
const lensIds = (process.env.DREAM_LENSES || defaultLensIds.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const demoRoadbook = process.env.DREAM_DEMO || "dali";
const dreamUrl = process.env.DREAM_URL || "http://localhost:3000/dream";
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const outRoot = process.env.DREAM_LENS_VISUAL_OUT_ROOT || path.join("recordings", "visual-checks");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

async function main() {
  for (const lensId of lensIds) {
    const outDir = path.join(outRoot, `${runStamp}-lens-${lensId}`);
    await runLensCheck(lensId, outDir);
  }

  console.log(`\nDream lens visual QA passed for ${lensIds.join(", ")}.`);
}

function runLensCheck(lensId, outDir) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> Dream lens visual QA: ${lensId}`);
    const child = spawn(npmCommand, ["run", "check:dream-visuals"], {
      env: {
        ...process.env,
        DREAM_DEMO: demoRoadbook,
        DREAM_LENS: lensId,
        DREAM_URL: dreamUrl,
        DREAM_VISUAL_OUT_DIR: outDir,
      },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Dream lens visual QA ${lensId} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
