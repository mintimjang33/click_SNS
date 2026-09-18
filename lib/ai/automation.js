// Gemini/ChatGPT/Claude 공통 자동화 로직. 크롬 확장판(sns-ai-writer-extension)의
// common-bridge.js createAiAutomation()과 같은 설계를 Playwright로 재구현한 것.
const { firstLocator, firstLocatorOrNull, sleep } = require("../domHelpers");

function dataUrlToBuffer(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("잘못된 dataURL 형식입니다.");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

function createAiAutomation(sel) {
  async function tryUseTemporaryChat(page) {
    const toggle = await firstLocatorOrNull(page, sel.temporaryChatToggle || [], { timeout: 2000 });
    if (toggle) {
      await toggle.click().catch(() => {});
      await sleep(500);
    }
  }

  async function attachImages(page, dataUrls) {
    if (!dataUrls || dataUrls.length === 0) return;
    const addBtn = await firstLocatorOrNull(page, sel.addImageButton || [], { timeout: 2000 });
    if (addBtn) {
      await addBtn.click().catch(() => {});
      await sleep(300);
    }
    const fileInput = await firstLocatorOrNull(page, sel.fileInput, { timeout: 5000 });
    if (!fileInput) {
      console.warn("[딸깍비서] 이미지 첨부 input을 못 찾음 - 이미지 없이 진행");
      return;
    }
    const files = dataUrls.map((durl, i) => {
      const { mimeType, buffer } = dataUrlToBuffer(durl);
      const ext = mimeType.split("/")[1] || "png";
      return { name: `ref-${i}.${ext}`, mimeType, buffer };
    });
    await fileInput.setInputFiles(files);
    await sleep(800 * dataUrls.length);
  }

  async function submitPrompt(page, text) {
    const input = await firstLocator(page, sel.promptInput, { timeout: 20000 });
    await input.click();
    try {
      await input.fill(text);
    } catch {
      await page.keyboard.press("Control+A");
      await page.keyboard.type(text, { delay: 5 });
    }
    await sleep(300);
    const sendBtn = await firstLocatorOrNull(page, sel.sendButton, { timeout: 3000 });
    if (sendBtn) {
      await sendBtn.click().catch(async () => {
        await page.keyboard.press("Enter");
      });
    } else {
      await page.keyboard.press("Enter");
    }
  }

  async function isGenerating(page) {
    const el = await firstLocatorOrNull(page, sel.generatingIndicator || [], { timeout: 500 });
    return !!el;
  }

  async function waitForResponseComplete(page, { minWaitMs = 3000, timeoutMs = 120000 } = {}) {
    await sleep(minWaitMs);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (!(await isGenerating(page))) {
        await sleep(1200);
        return;
      }
      await sleep(700);
    }
    throw new Error("응답 생성이 시간 내에 끝나지 않았습니다.");
  }

  async function extractLatestResponseText(page) {
    const nodes = page.locator(sel.responseContainer.join(", "));
    const count = await nodes.count();
    if (count === 0) return "";
    return (await nodes.nth(count - 1).innerText()).trim();
  }

  async function extractLatestResponseImages(page) {
    const selectorStr = (sel.generatedImage || []).join(", ");
    if (!selectorStr) return [];
    const nodes = page.locator(selectorStr);
    const count = await nodes.count();
    if (count === 0) return [];
    const take = Math.min(count, 10);
    const results = [];
    for (let i = count - take; i < count; i++) {
      const src = await nodes.nth(i).getAttribute("src").catch(() => null);
      if (!src) continue;
      try {
        const dataUrl = await page.evaluate(async (url) => {
          const res = await fetch(url);
          const blob = await res.blob();
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }, src);
        results.push(dataUrl);
      } catch (e) {
        console.warn("[딸깍비서] 이미지 추출 실패:", e.message);
      }
    }
    return results;
  }

  async function generateText(page, { promptText, images, preferTempChat }) {
    if (preferTempChat) await tryUseTemporaryChat(page);
    if (images && images.length > 0) await attachImages(page, images);
    await submitPrompt(page, promptText);
    await waitForResponseComplete(page);
    return { text: await extractLatestResponseText(page) };
  }

  async function generateImages(page, { promptText, referenceImage }) {
    if (referenceImage) await attachImages(page, [referenceImage]);
    await submitPrompt(page, promptText);
    await waitForResponseComplete(page, { minWaitMs: 5000, timeoutMs: 180000 });
    return { images: await extractLatestResponseImages(page) };
  }

  return { generateText, generateImages };
}

module.exports = { createAiAutomation };
