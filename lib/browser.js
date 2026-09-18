// 별도 프로필을 새로 만드는 대신, 사용자가 평소 쓰는 크롬(로그인 세션 그대로)에
// CDP(--remote-debugging-port)로 붙어서 그 브라우저의 새 탭을 직접 연다.
// 전제조건: 크롬이 --remote-debugging-port=9222 옵션으로 켜져 있어야 함
// (scripts/restart-chrome-debug.ps1 로 재시작하면 됨).
const { chromium } = require("playwright");

const CDP_URL = "http://localhost:9222";

let browserPromise = null;
let contextPromise = null;
const pages = {}; // key(예: 'gemini', 'naver_blog') -> Playwright Page

async function getContext() {
  if (!contextPromise) {
    contextPromise = (async () => {
      let browser;
      try {
        browser = await chromium.connectOverCDP(CDP_URL);
      } catch (e) {
        throw new Error(
          "크롬 디버그 포트(9222)에 연결하지 못했습니다. scripts/restart-chrome-debug.ps1 을 먼저 실행해서 " +
            "크롬을 디버그 모드로 재시작해 주세요. (" + e.message + ")"
        );
      }
      browserPromise = browser;
      const contexts = browser.contexts();
      if (contexts.length === 0) throw new Error("연결된 크롬에 열린 브라우저 컨텍스트가 없습니다.");
      return contexts[0];
    })();
  }
  return contextPromise;
}

async function getOrCreatePage(key, url) {
  const context = await getContext();
  let page = pages[key];
  if (page && !page.isClosed()) {
    if (url) await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
    return page;
  }
  page = await context.newPage();
  pages[key] = page;
  if (url) await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

function getExistingPage(key) {
  const page = pages[key];
  if (page && !page.isClosed()) return page;
  return null;
}

function listOpenPages() {
  return Object.entries(pages)
    .filter(([, page]) => page && !page.isClosed())
    .map(([key, page]) => ({ key, url: page.url() }));
}

async function closeAll() {
  // CDP로 붙은 것뿐이라, 여기서 실제 크롬을 끄지는 않는다(사용자의 평소 브라우저이므로).
  if (browserPromise) {
    await browserPromise.close().catch(() => {});
  }
  contextPromise = null;
  browserPromise = null;
}

module.exports = { getContext, getOrCreatePage, getExistingPage, closeAll, listOpenPages };
