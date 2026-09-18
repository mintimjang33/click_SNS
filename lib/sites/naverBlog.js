// blog.naver.com / cafe.naver.com 글쓰기 화면에 초안(제목/본문/태그)을 삽입.
// SmartEditor ONE은 iframe(#mainFrame 또는 #cafe_main) 안에 있어서 frameLocator로 접근.
const selectors = require("../selectors");
const { firstLocatorOrNull, sleep } = require("../domHelpers");

async function getEditorFrame(page, isCafe) {
  const sel = isCafe ? selectors.naverCafe : selectors.naverBlog;
  for (const frameSel of sel.editorIframe) {
    const iframeEl = page.locator(frameSel).first();
    if ((await iframeEl.count()) > 0) {
      return { frame: page.frameLocator(frameSel), sel };
    }
  }
  throw new Error("글쓰기 편집창(SmartEditor) iframe을 찾지 못했습니다.");
}

async function insertContent(page, payload) {
  const isCafe = /cafe\.naver\.com/.test(page.url());
  const { frame, sel } = await getEditorFrame(page, isCafe);

  const titleEl = await firstFrameLocator(frame, sel.titleField);
  if (titleEl) {
    await titleEl.click();
    await page.keyboard.type(payload.title || "", { delay: 3 });
  }

  await sleep(300);

  const bodyEl = await firstFrameLocator(frame, sel.bodyField);
  if (!bodyEl) throw new Error("본문 입력 영역을 찾지 못했습니다.");
  await bodyEl.click();
  await page.keyboard.type(payload.body || "", { delay: 1 });

  if (!isCafe && payload.tags) {
    const tagEl = await firstLocatorOrNull(page, sel.tagInput, { timeout: 2000 });
    if (tagEl) {
      const tags = Array.isArray(payload.tags) ? payload.tags : String(payload.tags).split(",");
      for (const tag of tags) {
        const t = tag.trim();
        if (!t) continue;
        await tagEl.click();
        await page.keyboard.type(t, { delay: 3 });
        await page.keyboard.press("Enter");
        await sleep(150);
      }
    }
  }

  return { inserted: true, note: "이미지 자동 삽입은 아직 미구현 - 본문/제목/태그만 채워짐" };
}

async function firstFrameLocator(frameLocator, selectorList) {
  for (const s of selectorList) {
    const loc = frameLocator.locator(s).first();
    try {
      if ((await loc.count()) > 0) return loc;
    } catch {
      /* 다음 후보 시도 */
    }
  }
  return null;
}

async function clickPublish(page) {
  const isCafe = /cafe\.naver\.com/.test(page.url());
  const sel = isCafe ? selectors.naverCafe : selectors.naverBlog;
  const btn = await firstLocatorOrNull(page, sel.publishButton, { timeout: 3000 });
  if (!btn) throw new Error("발행 버튼을 찾지 못했습니다. 수동으로 발행해 주세요.");
  await btn.click();
  return { published: true };
}

module.exports = { insertContent, clickPublish };
