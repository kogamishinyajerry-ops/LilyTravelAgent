// Drive the real /dream UI to render 5 mocked M3 roadbooks.
//
// We use Playwright + system Chrome to connect to http://localhost:3002/.
// The dev server's /api/generate-dream-preview and /api/generate-roadbook
// endpoints are intercepted via page.route() with a deterministic rich
// payload from scripts/demo-mocks/*.json. This lets us exercise the actual
// UI form / template / mood / submit flow without needing MINIMAX_API_KEY.
//
// For each scenario we:
//   1. Open /dream (form is on the left rail)
//   2. Fill the brief: destination, days, travel month, interests, "one preference"
//   3. Pick a template card (.dream-template-card[data-template=...])
//   4. Pick a mood swatch (.dream-mood-swatch[data-mood=...])
//   5. Click the .dream-generate-action button
//   6. Wait until the .roadbook (or .dream-title-block) shows the new title
//   7. Take a 1920x1080 screenshot
//
// All screenshots are saved to recording-shots/roadbook-demo/.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3002;
const BASE_URL = `http://localhost:${PORT}`;
const MOCKS_DIR = 'C:/Users/Kogami/Projects/LilyTravelAgent/scripts/demo-mocks';
const OUT_DIR = 'C:/Users/Kogami/Projects/LilyTravelAgent/recording-shots/roadbook-demo';

// 5 scenarios. Keys map 1:1 to files in MOCKS_DIR. The mock JSON already
// contains the full Roadbook shape, plus the wrapper { ok, model,
// generationMode, phase, roadbook }.
const SCENARIOS = [
  {
    id: 'kyoto',
    file: 'kyoto.json',
    destination: '日本京都',
    days: 3,
    month: '春季（樱花季）',
    interests: '古寺、和菓子、哲学之道',
    preference: '想要慢节奏 + 清冷神殿氛围',
    template: 'shrine',
    mood: 'dusk',
  },
  {
    id: 'iceland',
    file: 'iceland.json',
    destination: '冰岛',
    days: 7,
    month: '冬季（极光季）',
    interests: '极光、温泉、自然',
    preference: '想要纪念碑式冷峻 + 云海柔光',
    template: 'monument',
    mood: 'cloud',
  },
  {
    id: 'morocco',
    file: 'morocco.json',
    destination: '摩洛哥',
    days: 6,
    month: '秋季（舒适）',
    interests: '沙漠、老城、美食',
    preference: '想要大漠孤烟 + 暮色低饱和',
    template: 'desert',
    mood: 'dusk',
  },
  {
    id: 'newyork',
    file: 'newyork.json',
    destination: '美国纽约',
    days: 5,
    month: '秋季',
    interests: '美食、艺术、购物',
    preference: '想要霓虹都市 + 夜晚蓝紫调',
    template: 'neon-city',
    mood: 'neon',
  },
  {
    id: 'dali',
    file: 'dali.json',
    destination: '云南大理',
    days: 3,
    month: '秋季',
    interests: '古城、洱海、摄影',
    preference: '想要漂浮岛屿 + 云海柔光',
    template: 'island',
    mood: 'cloud',
  },
];

function loadMock(scenario) {
  const p = path.join(MOCKS_DIR, scenario.file);
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

async function driveOneScenario(page, scenario) {
  const consoleMsgs = [];
  const onConsole = (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`);
  const onError = (e) => consoleMsgs.push(`[pageerror] ${e.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onError);

  process.stdout.write(`\n=== ${scenario.id} (${scenario.destination}, ${scenario.days} days, ${scenario.template}/${scenario.mood}) ===\n`);

  // Open /dream fresh for each scenario so we always start from the demo state.
  await page.goto(`${BASE_URL}/dream`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('.dream-brief-form', { timeout: 15_000 });
  await page.waitForSelector('.dream-template-card', { timeout: 15_000 });
  await page.waitForSelector('.dream-mood-swatch', { timeout: 15_000 });
  await page.waitForTimeout(800);

  // 1) destination
  const destInput = page.locator('.dream-brief-form input[placeholder="云南大理"]');
  await destInput.fill('');
  await destInput.fill(scenario.destination);
  // The destination input also sets city internally.

  // 2) travel month
  const monthInput = page.locator('.dream-brief-form input[placeholder="秋季"]');
  await monthInput.fill('');
  await monthInput.fill(scenario.month);

  // 3) days
  const daysInput = page.locator('.dream-brief-form input[type="number"]');
  await daysInput.fill('');
  await daysInput.fill(String(scenario.days));

  // 4) interests
  const interestsInput = page.locator('.dream-brief-form input[placeholder="日落、咖啡、古城"]');
  await interestsInput.fill('');
  await interestsInput.fill(scenario.interests);

  // 5) one preference
  const prefInput = page.locator('.dream-brief-form textarea[placeholder="想要高级、梦境、少文字"]');
  await prefInput.fill('');
  await prefInput.fill(scenario.preference);

  // 6) template card — pick by data-template-id
  const templateCard = page.locator(`.dream-template-card[data-template-id="${scenario.template}"]`);
  const templateCount = await templateCard.count();
  if (templateCount === 0) {
    throw new Error(`Template card not found: ${scenario.template}`);
  }
  await templateCard.first().click({ force: true });
  await page.waitForTimeout(400);

  // 7) mood swatch — pick by data-mood
  const moodSwatch = page.locator(`.dream-mood-swatch[data-mood="${scenario.mood}"]`);
  const moodCount = await moodSwatch.count();
  if (moodCount === 0) {
    throw new Error(`Mood swatch not found: ${scenario.mood}`);
  }
  await moodSwatch.first().click({ force: true });
  await page.waitForTimeout(400);

  // 8) Submit. The button is .dream-generate-action[type=submit] inside the form.
  const submitBtn = page.locator('button.dream-generate-action[type="submit"]');
  await submitBtn.first().click({ force: true });

  // 9) Wait for the roadbook to render. /dream derives a destination short-name
  //    in .dream-title-block h2 (e.g. "京都三日" + "走进古寺") and a per-day
  //    area in .dream-detail h2. Wait until the destination token shows up
  //    in the title block (i.e. the roadbook state has updated past the demo
  //    default of "大理").
  const mock = loadMock(scenario);
  const expectedDestinationToken = scenario.destination.slice(0, 2);
  const firstStopName = mock.roadbook.days[0].stops[0].name;
  await page.waitForFunction(
    ({ destToken, firstStopName: stopName }) => {
      const titleH2 = document.querySelector('.dream-title-block h2');
      const detailH2 = document.querySelector('.dream-detail h2');
      const titleText = (titleH2?.textContent || '').trim();
      const detailText = (detailH2?.textContent || '').trim();
      // Either the destination shows up in the title, or the first stop name
      // shows up in the detail panel.
      const titleHasDest = titleText.includes(destToken) && !titleText.includes('大理');
      const detailHasStop = stopName && detailText.includes(stopName.slice(0, 4));
      return titleHasDest || detailHasStop;
    },
    { destToken: expectedDestinationToken, firstStopName },
    { timeout: 30_000 },
  );
  // Let the UI settle (3D scene, mini-map, toasts, etc.)
  await page.waitForTimeout(2500);

  // 10) Screenshot
  const out = path.join(OUT_DIR, `0${SCENARIOS.findIndex((s) => s.id === scenario.id) + 1}-${scenario.id}.png`);
  await page.screenshot({ path: out, fullPage: false });
  const size = fs.statSync(out).size;

  page.off('console', onConsole);
  page.off('pageerror', onError);

  return { name: path.basename(out), size, title: mock.roadbook.title, consoleMsgs };
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Pre-load mocks so we can fail fast if any is broken.
  for (const s of SCENARIOS) {
    const m = loadMock(s);
    if (!m.ok || !m.roadbook || !m.roadbook.days?.length) {
      throw new Error(`Mock invalid: ${s.file}`);
    }
    process.stdout.write(`mock ${s.file}: ${m.roadbook.title}, ${m.roadbook.days.length} days\n`);
  }

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Intercept both endpoints and serve the matching mock.
  await page.route('**/api/generate-dream-preview', async (route, request) => {
    if (request.method() !== 'POST') return route.fallback();
    const body = request.postDataJSON ? request.postDataJSON() : JSON.parse(request.postData() || '{}');
    const dest = (body.destination || '').trim();
    const scenario = SCENARIOS.find((s) => s.destination === dest)
      || SCENARIOS.find((s) => dest.includes(s.destination))
      || SCENARIOS[0];
    const mock = loadMock(scenario);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'x-mock-scenario': scenario.id },
      body: JSON.stringify({ ...mock, phase: 'preview' }),
    });
  });

  await page.route('**/api/generate-roadbook', async (route, request) => {
    if (request.method() !== 'POST') return route.fallback();
    const body = request.postDataJSON ? request.postDataJSON() : JSON.parse(request.postData() || '{}');
    const dest = (body.destination || '').trim();
    const scenario = SCENARIOS.find((s) => s.destination === dest)
      || SCENARIOS.find((s) => dest.includes(s.destination))
      || SCENARIOS[0];
    const mock = loadMock(scenario);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'x-mock-scenario': scenario.id },
      body: JSON.stringify({ ...mock, phase: 'full' }),
    });
  });

  // Also mock any other M3-related endpoints so they don't crash on no-key.
  // The dream-roadbook calls generate-preview-asset + geocode-places +
  // generate-scenic-render-design + generate-landmark-preset after the
  // roadbook lands. We can let them fail (the UI handles it) but it's
  // cleaner to short-circuit with safe fallbacks.
  await page.route('**/api/generate-preview-asset', async (route, request) => {
    if (request.method() === 'DELETE') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, cacheKey: 'mock', deleted: false, message: 'mock' }) });
    }
    // Respond with a tiny 1x1 transparent PNG data URL so the UI can render.
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        asset: {
          status: 'fallback',
          source: 'prompt-only',
          model: 'mock',
          prompt: 'mock',
          aspectRatio: '16:9',
          imageDataUrl: tinyPng,
          message: 'mocked',
          cacheStatus: 'stored',
          cacheKey: `mock-${Date.now()}`,
          cachedAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route('**/api/geocode-places', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        configured: false,
        points: [],
      }),
    });
  });

  const results = [];
  for (const scenario of SCENARIOS) {
    try {
      const r = await driveOneScenario(page, scenario);
      const kb = (r.size / 1024).toFixed(0);
      process.stdout.write(`  -> ${r.name}  ${kb} KB  (${r.title})\n`);
      if (r.consoleMsgs.length) {
        const first3 = r.consoleMsgs.slice(0, 3).join(' | ');
        process.stdout.write(`     console: ${first3}\n`);
      }
      results.push(r);
    } catch (e) {
      process.stdout.write(`  -> FAIL ${scenario.id}: ${e.message}\n`);
      results.push({ name: `${scenario.id}.png`, size: 0, error: e.message });
    }
  }

  await browser.close();

  console.log('\n=== summary ===');
  for (const r of results) {
    if (r.error) {
      console.log(`  FAIL  ${r.name}  ${r.error}`);
    } else {
      const ok = r.size > 200 * 1024 ? 'PASS' : 'SMALL';
      console.log(`  ${ok}  ${r.name}  ${(r.size / 1024).toFixed(0)} KB  (${r.title})`);
    }
  }
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
