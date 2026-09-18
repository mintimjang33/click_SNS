const selectors = require("../selectors").threads;
const { firstLocatorOrNull, sleep } = require("../domHelpers");

const MAX_CHARS = 500;

function dataUrlToBuffer(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("잘못된 dataURL 형식입니다.");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function insertContent(page, payload) {
  const field = await firstLocatorOrNull(page, selectors.composerField, { timeout: 5000 });
  if (!field) throw new Error("스레드 작성창을 찾지 못했습니다. '새로운 스레드 만들기'를 먼저 열어주세요.");

  let text = payload.body || "";
  const truncated = text.length > MAX_CHARS;
  if (truncated) text = text.slice(0, MAX_CHARS);

  await field.click();
  await page.keyboard.type(text, { delay: 2 });
  await sleep(200);

  let imagesInserted = 0;
  if (payload.images && payload.images.length > 0) {
    const fileInput = await firstLocatorOrNull(page, selectors.fileInput, { timeout: 3000 });
    if (fileInput) {
      const files = payload.images.map((durl, i) => {
        const { mimeType, buffer } = dataUrlToBuffer(durl);
        return { name: `thread-${i}.${mimeType.split("/")[1] || "png"}`, mimeType, buffer };
      });
      await fileInput.setInputFiles(files);
      imagesInserted = files.length;
      await sleep(600);
    }
  }

  return { inserted: true, imagesInserted, truncated };
}

async function clickPublish(page) {
  const btn = await firstLocatorOrNull(page, selectors.postButton, { timeout: 3000 });
  if (!btn) throw new Error("게시 버튼을 찾지 못했습니다. 수동으로 '게시'를 눌러주세요.");
  await btn.click();
  return { published: true };
}

module.exports = { insertContent, clickPublish };
