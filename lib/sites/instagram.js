// instagram.com "만들기" 다이얼로그(캡션 입력 단계까지 사용자가 미리 진행해둔 상태 전제)에
// 캡션을 채움. 이미지 업로드/크롭 자동화는 아직 미구현.
const selectors = require("../selectors").instagram;
const { firstLocatorOrNull } = require("../domHelpers");

async function insertContent(page, payload) {
  const field = await firstLocatorOrNull(page, selectors.captionField, { timeout: 5000 });
  if (!field) {
    throw new Error("캡션 입력창을 찾지 못했습니다. '만들기' 다이얼로그에서 캡션 입력 단계까지 진행한 뒤 다시 시도해 주세요.");
  }
  await field.click();
  await page.keyboard.type(payload.body || "", { delay: 3 });
  return { inserted: true, note: "캡션만 자동 삽입됨. 이미지 업로드는 다이얼로그에서 직접 선택해 주세요." };
}

async function clickPublish(page) {
  const btn = await firstLocatorOrNull(page, selectors.shareButton, { timeout: 3000 });
  if (!btn) throw new Error("공유 버튼을 찾지 못했습니다. 수동으로 '공유하기'를 눌러주세요.");
  await btn.click();
  return { published: true };
}

module.exports = { insertContent, clickPublish };
