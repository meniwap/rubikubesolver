import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const outputRoot = path.join(root, "output", "playwright");
const actionsDir = path.join(root, "tests", "playwright", "actions");
const clientPath =
  process.env.WEB_GAME_CLIENT ||
  path.join(os.homedir(), ".codex", "skills", "develop-web-game", "scripts", "web_game_playwright_client.js");

const SOLVED_FACELETS = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
const smokeOnly = process.argv.includes("--smoke");

function ensureClient() {
  if (!fs.existsSync(clientPath)) {
    throw new Error(`Playwright client not found at ${clientPath}. Set WEB_GAME_CLIENT env var if needed.`);
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        proc.kill("SIGTERM");
        reject(new Error("Timed out waiting for Vite dev server."));
      }
    }, 30000);

    function onData(data) {
      const text = data.toString();
      const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)\/?/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ proc, url: `http://127.0.0.1:${match[1]}` });
      }
    }

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);

    proc.on("exit", (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(new Error(`Vite dev server exited early with code ${code}`));
      }
    });
  });
}

function stopDevServer(proc) {
  return new Promise((resolve) => {
    if (!proc) return resolve();
    proc.once("exit", () => resolve());
    proc.kill("SIGTERM");
    setTimeout(() => {
      proc.kill("SIGKILL");
      resolve();
    }, 3000);
  });
}

function runClientScenario(baseUrl, scenario) {
  const scenarioDir = path.join(outputRoot, scenario.name);
  fs.rmSync(scenarioDir, { recursive: true, force: true });
  ensureDir(scenarioDir);

  const args = [
    clientPath,
    "--url",
    `${baseUrl}${scenario.path}`,
    "--actions-file",
    path.join(actionsDir, scenario.actionsFile),
    "--iterations",
    "1",
    "--pause-ms",
    String(scenario.pauseMs ?? 250),
    "--screenshot-dir",
    scenarioDir,
  ];
  if (scenario.clickSelector) {
    args.push("--click-selector", scenario.clickSelector);
  }

  const res = spawnSync("node", args, { cwd: root, stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`Client scenario failed: ${scenario.name}`);
  }

  const statePath = path.join(scenarioDir, "state-0.json");
  if (!fs.existsSync(statePath)) {
    throw new Error(`Missing state file for ${scenario.name}`);
  }
  const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  scenario.assert(state);
}

function assertStateBasics(state) {
  if (!state || typeof state !== "object") throw new Error("Missing state payload");
  if (state.facelets?.length !== 54) throw new Error("Invalid facelets length");
  if (state.visualMismatch === true) throw new Error("Visual mismatch detected");
}

async function getState(page) {
  const text = await page.evaluate(() => (window.render_game_to_text ? window.render_game_to_text() : null));
  if (!text) throw new Error("render_game_to_text missing");
  return JSON.parse(text);
}

async function stepTime(page, ms) {
  await page.evaluate(async (duration) => {
    if (typeof window.advanceTime === "function") {
      await window.advanceTime(duration);
    } else {
      await new Promise((resolve) => setTimeout(resolve, duration));
    }
  }, ms);
}

async function waitForState(page, predicate, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await getState(page);
    if (predicate(state)) return state;
    await stepTime(page, 100);
  }
  throw new Error("Timed out waiting for state condition");
}

async function clickByText(page, label) {
  await page.evaluate((text) => {
    const candidates = Array.from(document.querySelectorAll("button, a"));
    const target = candidates.find((el) => (el.textContent || "").trim().includes(text));
    if (!target) throw new Error(`Could not find clickable text: ${text}`);
    (target).click();
  }, label);
  await stepTime(page, 200);
}

async function runDirectScenarios(baseUrl, scenarios) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const scenario of scenarios) {
    await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: "domcontentloaded" });
    await stepTime(page, 300);
    await scenario.run(page, baseUrl);
  }

  await browser.close();
}

const clientScenarios = [
  {
    name: "play-idle",
    path: "/play",
    actionsFile: "idle.json",
    assert: (state) => {
      assertStateBasics(state);
      if (state.mode !== "play") throw new Error("Expected play mode");
    },
  },
  {
    name: "scramble",
    path: "/play",
    actionsFile: "wait_180.json",
    clickSelector: "text=Scramble",
    assert: (state) => {
      assertStateBasics(state);
      if (state.facelets === SOLVED_FACELETS) throw new Error("Scramble did not change facelets");
      if (state.isSolved !== false) throw new Error("Scramble should result in unsolved state");
    },
  },
  {
    name: "move-pad-right",
    path: "/play",
    actionsFile: "wait_60.json",
    clickSelector: 'button[title="Right"]',
    assert: (state) => {
      assertStateBasics(state);
      if (state.historyLength < 1) throw new Error("MovePad did not record move");
      if (state.facelets === SOLVED_FACELETS) throw new Error("MovePad did not change facelets");
    },
  },
];

const directScenarios = [
  {
    name: "keyboard-move",
    path: "/play",
    run: async (page) => {
      await page.keyboard.press("R");
      const state = await waitForState(page, (s) => s.historyLength >= 1 && !s.isAnimating);
      assertStateBasics(state);
      if (state.facelets === SOLVED_FACELETS) throw new Error("Keyboard move did not change facelets");
    },
  },
  {
    name: "undo-redo",
    path: "/play",
    run: async (page) => {
      await page.keyboard.press("R");
      await waitForState(page, (s) => s.historyLength === 1 && !s.isAnimating);
      await page.click("text=Undo");
      const afterUndo = await waitForState(page, (s) => s.historyLength === 0 && !s.isAnimating);
      assertStateBasics(afterUndo);
      if (afterUndo.facelets !== SOLVED_FACELETS) throw new Error("Undo did not restore solved state");
      await page.click("text=Redo");
      const afterRedo = await waitForState(page, (s) => s.historyLength === 1 && !s.isAnimating);
      assertStateBasics(afterRedo);
      if (afterRedo.facelets === SOLVED_FACELETS) throw new Error("Redo did not reapply move");
    },
  },
  {
    name: "solve-optimal",
    path: "/play",
    run: async (page) => {
      await page.click("text=Scramble");
      await waitForState(page, (s) => !s.isAnimating && s.queueLength === 0 && !s.isSolved);
      await page.click("text=פתרו (אופטימלי)");
      const solved = await waitForState(page, (s) => !s.isAnimating && s.queueLength === 0 && s.isSolved, 60000);
      assertStateBasics(solved);
    },
  },
  {
    name: "solve-beginner",
    path: "/play",
    run: async (page) => {
      await page.click("text=Scramble");
      await waitForState(page, (s) => !s.isAnimating && s.queueLength === 0 && !s.isSolved);
      await page.click("text=פתרו (מתחילים)");
      const solved = await waitForState(page, (s) => !s.isAnimating && s.queueLength === 0 && s.isSolved, 60000);
      assertStateBasics(solved);
    },
  },
  {
    name: "solve-session-timer",
    path: "/play",
    run: async (page) => {
      await clickByText(page, "התחל סשן");
      await waitForState(page, (s) => s.pendingTimerStart === true, 30000);
      await waitForState(page, (s) => !s.isAnimating && s.queueLength === 0);
      const before = await getState(page);
      if (before.timer.running) throw new Error("Timer should not run before first user move");
      if (before.pendingTimerStart !== true) throw new Error("Pending timer flag missing before first move");
      await page.keyboard.press("R");
      const after = await waitForState(page, (s) => s.timer.running === true);
      if (after.timer.elapsedMs <= 0) throw new Error("Timer did not start after first move");
    },
  },
  {
    name: "timer-stops-on-solve",
    path: "/play",
    run: async (page) => {
      await page.keyboard.press("Space");
      await page.keyboard.press("R");
      await waitForState(page, (s) => s.historyLength === 1 && !s.isAnimating);
      await page.keyboard.press("Shift+R");
      const solved = await waitForState(page, (s) => s.isSolved && !s.isAnimating);
      assertStateBasics(solved);
      if (solved.timer.running) throw new Error("Timer did not stop on solve");
      if (solved.timer.elapsedMs <= 0) throw new Error("Timer did not record elapsed time");
      if (!solved.stats.lastMs) throw new Error("Stats not updated on solve");
    },
  },
  {
    name: "drag-gesture",
    path: "/play",
    run: async (page) => {
      const canvas = await page.$("canvas");
      if (!canvas) throw new Error("Canvas not found");
      const box = await canvas.boundingBox();
      if (!box) throw new Error("Canvas bounding box missing");
      const startX = box.x + box.width * 0.6;
      const startY = box.y + box.height * 0.4;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 80, startY);
      await page.mouse.up();
      const state = await waitForState(page, (s) => s.historyLength >= 1 && !s.isAnimating);
      assertStateBasics(state);
    },
  },
  {
    name: "fullscreen-toggle",
    path: "/play",
    run: async (page) => {
      const enabled = await page.evaluate(() => document.fullscreenEnabled);
      if (!enabled) return;
      await page.keyboard.press("F");
      const entered = await page.evaluate(() => Boolean(document.fullscreenElement));
      if (!entered) {
        console.warn("Fullscreen not supported in this environment; skipping.");
        return;
      }
      await page.keyboard.press("Escape");
      await stepTime(page, 200);
    },
  },
  {
    name: "enter-cube-flow",
    path: "/enter",
    run: async (page) => {
      await page.click("text=טען מצב פתור");
      await page.click("text=טען למשחק");
      await page.waitForSelector("text=הקובייה נטענה בהצלחה");
      await page.click("text=Play");
      const state = await waitForState(page, (s) => s.mode === "play" && !s.isAnimating);
      assertStateBasics(state);
      if (!state.isSolved) throw new Error("Expected solved state after loading solved cube");
    },
  },
  {
    name: "enter-cube-invalid-centers",
    path: "/enter",
    run: async (page) => {
      await page.click("text=U (למעלה)");
      await stepTime(page, 150);
      await page.click('button[title="אדום"]');
      await stepTime(page, 150);
      await page.click('button[title="U (למעלה) 5"]');
      await stepTime(page, 150);
      await page.click("text=טען למשחק");
      await page.waitForSelector("text=המרכזים חייבים להיות שישה צבעים שונים", { timeout: 5000 });
    },
  },
  {
    name: "learn-hint-apply",
    path: "/learn",
    run: async (page) => {
      await page.click('button[title="Right"]');
      await waitForState(page, (s) => s.historyLength === 1 && !s.isAnimating);
      await clickByText(page, "רמז");
      const withHint = await waitForState(page, (s) => Boolean(s.hint && s.hint.nextMove));
      assertStateBasics(withHint);
      await clickByText(page, "בצע מהלך");
      const afterMove = await waitForState(page, (s) => s.historyLength >= 2 && !s.isAnimating);
      assertStateBasics(afterMove);
    },
  },
  {
    name: "rapid-input-queue",
    path: "/play",
    run: async (page) => {
      const keys = ["R", "U", "F", "D", "L", "B"];
      for (const key of keys) {
        await page.keyboard.press(key);
      }
      const state = await waitForState(page, (s) => s.queueLength === 0 && !s.isAnimating);
      assertStateBasics(state);
      if (state.historyLength < keys.length) throw new Error("Not all rapid moves were processed");
    },
  },
];

const smokeNames = new Set(["play-idle", "scramble", "move-pad-right", "keyboard-move", "solve-session-timer"]);

async function main() {
  ensureClient();
  ensureDir(outputRoot);

  const { proc, url } = await startDevServer();
  try {
    const selectedClient = smokeOnly ? clientScenarios.filter((s) => smokeNames.has(s.name)) : clientScenarios;
    const selectedDirect = smokeOnly ? directScenarios.filter((s) => smokeNames.has(s.name)) : directScenarios;

    for (const scenario of selectedClient) {
      runClientScenario(url, scenario);
    }
    await runDirectScenarios(url, selectedDirect);
  } finally {
    await stopDevServer(proc);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
