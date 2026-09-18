const selectors = require("../selectors").blogger;
const { firstLocatorOrNull, sleep } = require("../domHelpers");

async function getBodyLocator(page) {
  for (const frameSel of selectors.editorIframe) {
    const iframeEl = page.locator(frameSel).first();
    if ((await iframeEl.count()) > 0) {
      const frame = page.frameLocator(frameSel);
      for (const bodySel of selectors.bodyField) {
        const loc = frame.locator(bodySel).first();
        if ((await loc.count().catch(() => 0)) > 0) return loc;
      }
    }
  }
  // 구버전 UI는 iframe 없이 top frame에 바로 있을 수 있음
  return firstLocatorOrNull(page, selectors.bodyField, { timeout: 2000 });
}

async function insertContent(page, payload) {
  const titleEl = await firstLocatorOrNull(page, selectors.titleField, { timeout: 3000 });
  if (titleEl) {
    await titleEl.click();
    await page.keyboard.type(payload.title || "", { delay: 3 });
  }

  await sleep(200);

  const bodyEl = await getBodyLocator(page);
  if (!bodyEl) throw new Error("Blogger 본문 편집 영역을 찾지 못했습니다.");
  await bodyEl.click();
  await page.keyboard.type(payload.body || "", { delay: 1 });

  if (payload.tags) {
    const labelEl = await firstLocatorOrNull(page, selectors.labelInput, { timeout: 2000 });
    if (labelEl) {
      const tags = Array.isArray(payload.tags) ? payload.tags.join(", ") : payload.tags;
      await labelEl.click();
      await page.keyboard.type(tags, { delay: 3 });
    }
  }

  return { inserted: true, note: "이미지 자동 삽입은 아직 미구현 - 제목/본문/라벨만 채워짐" };
}

async function clickPublish(page) {
  const btn = await firstLocatorOrNull(page, selectors.publishButton, { timeout: 3000 });
  if (!btn) throw new Error("발행 버튼을 찾지 못했습니다. 수동으로 발행해 주세요.");
  await btn.click();
  return { published: true };
}

module.exports = { insertContent, clickPublish };
