const express = require("express");
const path = require("path");
const browser = require("./lib/browser");

const geminiAi = require("./lib/ai/gemini");
const chatgptAi = require("./lib/ai/chatgpt");
const claudeAi = require("./lib/ai/claude");

const naverBlogSite = require("./lib/sites/naverBlog");
const instagramSite = require("./lib/sites/instagram");
const threadsSite = require("./lib/sites/threads");
const bloggerSite = require("./lib/sites/blogger");

const AI_MODULES = { gemini: geminiAi, chatgpt: chatgptAi, claude: claudeAi };

const PLATFORM_URL = {
  naver_blog: "https://blog.naver.com/",
  naver_cafe: "https://cafe.naver.com/",
  instagram: "https://www.instagram.com/",
  threads: "https://www.threads.net/",
  blogger: "https://www.blogger.com/",
};

const PLATFORM_URL_PATTERN = {
  naver_blog: /blog\.naver\.com/,
  naver_cafe: /cafe\.naver\.com/,
  instagram: /instagram\.com/,
  threads: /threads\.(net|com)/,
  blogger: /blogger\.com/,
};

function siteModuleFor(platform) {
  if (platform === "naver_blog" || platform === "naver_cafe") return naverBlogSite;
  if (platform === "instagram") return instagramSite;
  if (platform === "threads") return threadsSite;
  if (platform === "blogger") return bloggerSite;
  throw new Error("알 수 없는 플랫폼: " + platform);
}

let connected = null; // { platform, url }

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------------- 사이트 열기 / 연결 ----------------
app.post("/api/open-site", async (req, res) => {
  try {
    const { platform } = req.body;
    const url = PLATFORM_URL[platform];
    if (!url) return res.status(400).json({ error: "지원하지 않는 플랫폼: " + platform });
    const page = await browser.getOrCreatePage(platform, url);
    await page.bringToFront();
    res.json({ opened: true, url: page.url() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/connect", async (req, res) => {
  try {
    const { platform } = req.body;
    const page = browser.getExistingPage(platform);
    if (!page) throw new Error("먼저 '사이트 열기'로 탭을 열어주세요.");
    const url = page.url();
    const pattern = PLATFORM_URL_PATTERN[platform];
    if (!pattern || !pattern.test(url)) {
      throw new Error("현재 탭이 " + platform + " 페이지가 아닙니다. (현재: " + url + ")");
    }
    connected = { platform, url };
    res.json({ connected });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/connected", (req, res) => {
  res.json({ connected });
});

// ---------------- AI 초안/이미지 생성 ----------------
app.post("/api/generate-draft", async (req, res) => {
  try {
    const { engine, payload } = req.body;
    const ai = AI_MODULES[engine];
    if (!ai) throw new Error("지원하지 않는 AI 엔진: " + engine);
    const page = await browser.getOrCreatePage("ai_" + engine, ai.URL);
    await page.bringToFront();
    const result = await ai.generateText(page, payload);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/generate-images", async (req, res) => {
  try {
    const { engine, payload } = req.body;
    const ai = AI_MODULES[engine];
    if (!ai) throw new Error("지원하지 않는 AI 엔진: " + engine);
    const page = await browser.getOrCreatePage("ai_" + engine, ai.URL);
    await page.bringToFront();
    const result = await ai.generateImages(page, payload);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- 삽입 / 발행 ----------------
app.post("/api/insert", async (req, res) => {
  try {
    if (!connected) throw new Error("연결된 탭이 없습니다. '현재 탭 연결하기'를 먼저 눌러주세요.");
    const page = browser.getExistingPage(connected.platform);
    if (!page) throw new Error("연결된 탭이 닫혔습니다. 다시 열고 연결해 주세요.");
    const site = siteModuleFor(connected.platform);
    const result = await site.insertContent(page, req.body.payload);
    if (req.body.autoPublish) {
      await site.clickPublish(page);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- 디버그 ----------------
app.get("/api/debug/screenshot", async (req, res) => {
  try {
    const key = req.query.target;
    const page = browser.getExistingPage(key);
    if (!page) return res.status(404).json({ error: "해당 이름의 열린 탭이 없습니다: " + key });
    const buf = await page.screenshot({ fullPage: false });
    res.set("Content-Type", "image/png");
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/debug/dom", async (req, res) => {
  try {
    const key = req.query.target;
    const page = browser.getExistingPage(key);
    if (!page) return res.status(404).json({ error: "해당 이름의 열린 탭이 없습니다: " + key });
    const items = await page.evaluate(() => {
      const els = document.querySelectorAll("button, a, input, textarea, select, [contenteditable='true'], [role='button'], [role='textbox']");
      return Array.from(els)
        .slice(0, 200)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          role: el.getAttribute("role"),
          ariaLabel: el.getAttribute("aria-label"),
          placeholder: el.getAttribute("placeholder"),
          text: (el.innerText || el.value || "").slice(0, 60),
          visible: !!(el.offsetWidth || el.offsetHeight),
        }));
    });
    res.json({ url: page.url(), items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/pages", (req, res) => {
  res.json({ pages: browser.listOpenPages() });
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
  console.log(`딸깍비서 서버 실행 중: http://localhost:${PORT}`);
  console.log("브라우저 창이 뜨면 Gemini/네이버 등에 로그인해 두세요 (한 번만 하면 계속 유지됩니다).");
});
