// 여러 후보 선택자 중 실제 화면에 존재하는 첫 번째를 찾아주는 헬퍼들.
// Playwright locator는 지연 평가라서, count()로 실제 존재 여부를 확인해야 한다.

async function firstLocator(page, selectors, { timeout = 15000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      try {
        if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
          return loc;
        }
      } catch {
        // 셀렉터 문법 오류 등은 무시하고 다음 후보로
      }
    }
    await page.waitForTimeout(300);
  }
  throw new Error(`요소를 찾지 못했습니다 (${timeout}ms 초과): ${selectors.join(" | ")}`);
}

async function firstLocatorOrNull(page, selectors, { timeout = 3000 } = {}) {
  try {
    return await firstLocator(page, selectors, { timeout });
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { firstLocator, firstLocatorOrNull, sleep };
