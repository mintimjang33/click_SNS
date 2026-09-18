const $ = (id) => document.getElementById(id);

const PLATFORM_LABEL = {
  naver_blog: "네이버 블로그",
  naver_cafe: "네이버 카페",
  instagram: "인스타그램",
  threads: "스레드",
  blogger: "Blogger",
};

const state = {
  draft: { title: "", body: "", tags: "" },
  images: [],
  photos: [],
  logs: [],
};

function log(line) {
  const ts = new Date().toLocaleTimeString("ko-KR", { hour12: false });
  state.logs.push(`[${ts}] ${line}`);
  const el = $("log-console");
  el.textContent = state.logs.join("\n");
  el.scrollTop = el.scrollHeight;
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패: ${path}`);
  return data;
}

// ---------------- 사이트 연결 ----------------
$("btn-open-site").addEventListener("click", async () => {
  const platform = $("site-select").value;
  try {
    log(`사이트 여는 중: ${PLATFORM_LABEL[platform]}`);
    const res = await api("/api/open-site", { method: "POST", body: JSON.stringify({ platform }) });
    log(`열림: ${res.url} — 브라우저 창에서 로그인/글쓰기 화면까지 이동한 뒤 '현재 탭 연결하기'를 눌러주세요.`);
  } catch (e) {
    log("사이트 열기 실패: " + e.message);
    alert(e.message);
  }
});

$("btn-connect").addEventListener("click", async () => {
  const platform = $("site-select").value;
  try {
    const res = await api("/api/connect", { method: "POST", body: JSON.stringify({ platform }) });
    $("connect-status-text").textContent = `연결됨: ${PLATFORM_LABEL[platform]} (${res.connected.url})`;
    log(`탭 연결 완료: ${PLATFORM_LABEL[platform]}`);
  } catch (e) {
    log("탭 연결 실패: " + e.message);
    alert(e.message);
  }
});

async function loadConnected() {
  try {
    const res = await api("/api/connected");
    if (res.connected) {
      $("connect-status-text").textContent = `연결됨: ${PLATFORM_LABEL[res.connected.platform]} (${res.connected.url})`;
    }
  } catch {
    /* 서버가 아직 안 떴을 수 있음 */
  }
}

// ---------------- 작성 모드 ----------------
function isPhotoMode() {
  return $("write-mode-select").value.endsWith("my_photos");
}
function refreshModeUI() {
  $("photo-upload-card").classList.toggle("hidden", !isPhotoMode());
}
$("write-mode-select").addEventListener("change", refreshModeUI);
refreshModeUI();

$("photo-input").addEventListener("change", async (e) => {
  for (const f of Array.from(e.target.files || [])) {
    state.photos.push(await fileToDataUrl(f));
  }
  renderGallery("photo-gallery", state.photos);
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderGallery(elId, dataUrls) {
  const el = $(elId);
  el.innerHTML = "";
  dataUrls.forEach((durl) => {
    const img = document.createElement("img");
    img.src = durl;
    el.appendChild(img);
  });
}

// ---------------- 초안 작성 ----------------
function buildDraftPrompt() {
  const method = $("draft-method-select").value;
  const topic = $("topic-input").value.trim();
  const audience = $("audience-input").value.trim();
  const keywords = $("keywords-input").value.trim();
  const extra = $("extra-request-input").value.trim();
  const tone = $("tone-select").selectedOptions[0].textContent;
  const length = $("length-select").selectedOptions[0].textContent;
  const postType = $("post-type-select").selectedOptions[0].textContent;

  const methodNote = {
    manual: "주제와 조건을 사용자가 직접 입력했습니다. 아래 정보만으로 작성하세요.",
    naver_search_ref: "네이버 검색 결과 상위 노출 글들의 구조(소제목 배치, 키워드 밀도)를 참고해서 SEO에 유리하게 작성하세요.",
    naver_blog_search_ref: "기존 내 네이버 블로그의 관련 글들을 참고하는 느낌으로, 톤과 형식의 일관성을 유지해서 작성하세요.",
  }[method];

  return [
    "당신은 블로그/SNS 글쓰기 도우미입니다. 아래 조건에 맞춰 완성된 글을 작성해 주세요.",
    methodNote,
    `주제: ${topic}`,
    audience && `대상 독자: ${audience}`,
    keywords && `핵심 키워드: ${keywords}`,
    `톤: ${tone} / 분량: ${length} / 글 유형: ${postType}`,
    extra && `추가 요청사항: ${extra}`,
    `출력 형식은 반드시 아래처럼: 첫 줄에 "제목: ..." , 그 다음 줄부터 본문, 마지막 줄에 "태그: 쉼표로구분".`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseDraftResponse(text) {
  const titleMatch = text.match(/제목\s*[:：]\s*(.+)/);
  const tagsMatch = text.match(/태그\s*[:：]\s*(.+)/);
  let body = text;
  if (titleMatch) body = body.replace(titleMatch[0], "");
  if (tagsMatch) body = body.replace(tagsMatch[0], "");
  return {
    title: titleMatch ? titleMatch[1].trim() : "",
    body: body.trim(),
    tags: tagsMatch ? tagsMatch[1].trim() : "",
  };
}

function showProgress(text) {
  $("progress-card").classList.remove("hidden");
  $("progress-text").textContent = text;
}
function hideProgress() {
  $("progress-card").classList.add("hidden");
}

$("btn-generate-draft").addEventListener("click", async () => {
  const engine = $("text-ai-select").value;
  const promptText = buildDraftPrompt();
  const images = isPhotoMode() ? state.photos : [];
  const preferTempChat = $("ai-chat-mode-select").value === "temp-chat";

  showProgress("초안 작성 중… (AI 창이 앞으로 옵니다)");
  log(`초안 작성 요청 (엔진: ${engine})`);
  try {
    const res = await api("/api/generate-draft", {
      method: "POST",
      body: JSON.stringify({ engine, payload: { promptText, images, preferTempChat } }),
    });
    const parsed = parseDraftResponse(res.text || "");
    state.draft = parsed;
    $("draft-title").value = parsed.title;
    $("draft-body").value = parsed.body;
    $("draft-tags").value = parsed.tags;
    $("draft-empty").classList.add("hidden");
    $("draft-edit-block").classList.remove("hidden");
    log("초안 작성 완료");
  } catch (e) {
    log("초안 작성 실패: " + e.message);
    alert("초안 작성 실패: " + e.message);
  } finally {
    hideProgress();
  }
});

$("draft-title").addEventListener("input", (e) => (state.draft.title = e.target.value));
$("draft-body").addEventListener("input", (e) => (state.draft.body = e.target.value));
$("draft-tags").addEventListener("input", (e) => (state.draft.tags = e.target.value));

$("btn-revise").addEventListener("click", async () => {
  const instruction = $("revise-input").value.trim();
  if (!instruction) return;
  const engine = $("text-ai-select").value;
  const promptText = `아래는 현재까지의 초안입니다.\n---\n제목: ${state.draft.title}\n${state.draft.body}\n태그: ${state.draft.tags}\n---\n다음 요청을 반영해서 전체를 다시 작성해 주세요: ${instruction}\n출력 형식은 이전과 동일하게 "제목: / 본문 / 태그:" 형태로 해주세요.`;

  showProgress("수정 반영 중…");
  log("수정 요청: " + instruction);
  try {
    const res = await api("/api/generate-draft", { method: "POST", body: JSON.stringify({ engine, payload: { promptText } }) });
    const parsed = parseDraftResponse(res.text || "");
    state.draft = parsed;
    $("draft-title").value = parsed.title;
    $("draft-body").value = parsed.body;
    $("draft-tags").value = parsed.tags;
    $("revise-input").value = "";
    log("수정 완료");
  } catch (e) {
    log("수정 실패: " + e.message);
    alert("수정 실패: " + e.message);
  } finally {
    hideProgress();
  }
});

// ---------------- HTML 미리보기 / 복사 ----------------
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function buildHtml() {
  const bodyHtml = (state.draft.body || "")
    .split("\n")
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : ""))
    .join("\n");
  const imagesHtml = state.images.map((src) => `<img src="${src}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`).join("\n");
  return `<article>\n  <h1>${escapeHtml(state.draft.title || "")}</h1>\n  ${imagesHtml}\n  ${bodyHtml}\n  <p style="font-size:12px;">태그: ${escapeHtml(state.draft.tags || "")}</p>\n</article>`;
}

$("btn-view-html").addEventListener("click", () => {
  $("preview-frame").srcdoc = buildHtml();
  $("modal-preview").classList.remove("hidden");
});
$("btn-close-preview").addEventListener("click", () => $("modal-preview").classList.add("hidden"));
$("btn-copy-html").addEventListener("click", async () => {
  await navigator.clipboard.writeText(buildHtml());
  log("HTML 복사됨");
});

// ---------------- 이미지 생성 ----------------
let refImageDataUrl = null;
$("ref-image-input").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  refImageDataUrl = f ? await fileToDataUrl(f) : null;
});

$("btn-generate-images").addEventListener("click", async () => {
  if (!state.draft.body) {
    alert("먼저 초안을 작성해 주세요.");
    return;
  }
  const engine = $("text-ai-select").value === "chatgpt" ? "chatgpt" : "gemini";
  const imageType = $("image-type-select").value;
  const requirement = $("image-req-input").value.trim();
  const refPrompt = $("ref-image-prompt-input").value.trim();

  const promptText = [
    imageType === "card-news"
      ? "다음 블로그 글 내용을 바탕으로 텍스트 오버레이가 들어간 카드뉴스 스타일 이미지를 생성해 주세요."
      : "다음 블로그 글 내용을 바탕으로 어울리는 일반 이미지를 생성해 주세요.",
    `글 제목: ${state.draft.title}`,
    `글 요약: ${state.draft.body.slice(0, 300)}`,
    requirement && `요구사항: ${requirement}`,
    refImageDataUrl && refPrompt && `참고 이미지 반영 방법: ${refPrompt}`,
  ]
    .filter(Boolean)
    .join("\n");

  showProgress("이미지 생성 중… (시간이 걸릴 수 있습니다)");
  log("이미지 생성 요청 (" + imageType + ")");
  try {
    const res = await api("/api/generate-images", {
      method: "POST",
      body: JSON.stringify({ engine, payload: { promptText, referenceImage: refImageDataUrl } }),
    });
    state.images = state.images.concat(res.images || []);
    $("image-gallery").classList.remove("hidden");
    $("image-gallery-empty").classList.add("hidden");
    renderGallery("image-gallery", state.images);
    log(`이미지 ${(res.images || []).length}장 생성 완료`);
  } catch (e) {
    log("이미지 생성 실패: " + e.message);
    alert("이미지 생성 실패: " + e.message);
  } finally {
    hideProgress();
  }
});

$("btn-clear-images").addEventListener("click", () => {
  state.images = [];
  $("image-gallery").innerHTML = "";
  $("image-gallery").classList.add("hidden");
  $("image-gallery-empty").classList.remove("hidden");
  log("이미지 갤러리 비움");
});

// ---------------- 최종 삽입 ----------------
$("btn-insert").addEventListener("click", async () => {
  const autoPublish = $("auto-publish-toggle").checked;
  showProgress("연결된 창에 삽입 중…");
  log("연결된 글쓰기창에 삽입 시작" + (autoPublish ? " (자동 발행 포함)" : ""));
  try {
    const res = await api("/api/insert", {
      method: "POST",
      body: JSON.stringify({
        payload: { title: state.draft.title, body: state.draft.body, tags: state.draft.tags, images: state.images },
        autoPublish,
      }),
    });
    log("삽입 완료: " + (res.note || "성공"));
  } catch (e) {
    log("삽입 실패: " + e.message);
    alert("삽입 실패: " + e.message);
  } finally {
    hideProgress();
  }
});

$("btn-reset-result").addEventListener("click", () => {
  state.draft = { title: "", body: "", tags: "" };
  state.images = [];
  $("draft-title").value = "";
  $("draft-body").value = "";
  $("draft-tags").value = "";
  $("draft-edit-block").classList.add("hidden");
  $("draft-empty").classList.remove("hidden");
  $("image-gallery").innerHTML = "";
  $("image-gallery").classList.add("hidden");
  $("image-gallery-empty").classList.remove("hidden");
  log("결과 초기화됨");
});

// ---------------- 로그 ----------------
$("btn-copy-log").addEventListener("click", async () => {
  await navigator.clipboard.writeText(state.logs.join("\n"));
});

// ---------------- 디버그 ----------------
$("btn-debug-screenshot").addEventListener("click", async () => {
  const target = $("debug-target-select").value;
  const img = $("debug-screenshot-img");
  img.src = `/api/debug/screenshot?target=${target}&t=${Date.now()}`;
  img.classList.remove("hidden");
  img.onerror = () => {
    img.classList.add("hidden");
    alert("해당 탭이 아직 열려있지 않습니다. 먼저 사이트를 열거나 초안 작성을 한 번 실행해 보세요.");
  };
});

$("btn-debug-dom").addEventListener("click", async () => {
  const target = $("debug-target-select").value;
  try {
    const res = await api(`/api/debug/dom?target=${target}`);
    $("debug-dom-output").textContent = JSON.stringify(res, null, 2);
    $("debug-dom-output").classList.remove("hidden");
  } catch (e) {
    alert(e.message);
  }
});

// ---------------- 초기화 ----------------
loadConnected();
log("페이지 로드 완료. 준비되었습니다.");
