// ⚠️ 가장 자주 깨지는 파일. 구글/네이버/인스타/스레드/블로거는 DOM을 수시로 바꾸므로,
// 실제로 안 먹히면 GET /api/debug/dom?target=... 으로 현재 페이지의 상호작용 요소를 덤프해서
// 여기 선택자 배열에 후보를 추가할 것. 배열 순서대로 시도하다가 처음 매칭되는 걸 씁니다.
module.exports = {
  gemini: {
    promptInput: [
      "rich-textarea .ql-editor",
      "div.ql-editor[contenteditable='true']",
      "[contenteditable='true'][aria-label*='프롬프트']",
      "[contenteditable='true'][aria-label*='Enter a prompt']",
    ],
    sendButton: [
      "button[aria-label*='보내기']",
      "button[aria-label*='Send message']",
      "button.send-button",
    ],
    fileInput: ["input[type='file']"],
    addImageButton: [
      "button[aria-label*='이미지']",
      "button[aria-label*='파일 업로드']",
      "button[aria-label*='Upload']",
      "uploader-button button",
    ],
    responseContainer: [
      "message-content .markdown",
      ".model-response-text .markdown",
      "[data-response-index] .markdown",
    ],
    generatingIndicator: [
      "[data-testid='generating-indicator']",
      ".loading-indicator",
      "button[aria-label*='응답 중지']",
      "button[aria-label*='Stop']",
    ],
    generatedImage: ["message-content img", ".model-response-text img", "[data-response-index] img"],
    temporaryChatToggle: ["button[aria-label*='임시 채팅']", "button[aria-label*='Temporary chat']"],
  },

  chatgpt: {
    promptInput: ["#prompt-textarea", "div[contenteditable='true']#prompt-textarea"],
    sendButton: ["button[data-testid='send-button']"],
    fileInput: ["input[type='file']"],
    addImageButton: ["button[aria-label*='첨부']", "button[aria-label*='Attach']"],
    responseContainer: ["[data-message-author-role='assistant']"],
    generatingIndicator: ["button[data-testid='stop-button']"],
    generatedImage: ["[data-message-author-role='assistant'] img"],
    temporaryChatToggle: ["button[aria-label*='임시 채팅']", "button[aria-label*='Temporary chat']"],
  },

  claude: {
    promptInput: ["div[contenteditable='true'][aria-label*='프롬프트']", "div.ProseMirror[contenteditable='true']"],
    sendButton: ["button[aria-label*='전송']", "button[aria-label*='Send message']"],
    fileInput: ["input[type='file']"],
    addImageButton: ["button[aria-label*='첨부']", "button[aria-label*='Attach']"],
    responseContainer: ["div[data-testid='conversation-turn'] .prose", "[data-testid='assistant-turn']"],
    generatingIndicator: ["button[aria-label*='응답 중지']", "button[aria-label*='Stop response']"],
    generatedImage: ["[data-testid='assistant-turn'] img"],
    temporaryChatToggle: ["button[aria-label*='임시 채팅']", "button[aria-label*='incognito']"],
  },

  naverBlog: {
    editorIframe: ["iframe#mainFrame"],
    titleField: [".se-documentTitle .se-text-paragraph", ".se-title-text", "[data-a11y-title-input]"],
    bodyField: [".se-main-container .se-component-content", ".se-text-paragraph", ".se-container"],
    tagInput: ["#tag-input, .tag_input", "input[placeholder*='태그']"],
    publishButton: [".publish_btn__m9KHH", "button[data-click-area*='publish']"],
  },

  naverCafe: {
    editorIframe: ["iframe#cafe_main"],
    titleField: [".se-documentTitle .se-text-paragraph", "input.subject"],
    bodyField: [".se-main-container .se-component-content", ".se-text-paragraph"],
    publishButton: [".BaseButton--skinGreen", "button[type='submit']"],
  },

  instagram: {
    captionField: [
      "textarea[aria-label='Write a caption...']",
      "div[aria-label='Write a caption...']",
      "textarea[aria-label*='caption']",
    ],
    fileInput: ["input[type='file'][accept*='image']"],
    shareButton: ["div[role='button']:has-text('Share')", "button:has-text('Share')"],
  },

  threads: {
    composerField: [
      "div[contenteditable='true'][aria-label*='새로운 스레드']",
      "div[contenteditable='true'][aria-label*='new thread']",
      "div[role='textbox'][contenteditable='true']",
    ],
    fileInput: ["input[type='file']"],
    postButton: ["div[role='button'][aria-label='게시']", "div[role='button'][aria-label='Post']"],
  },

  blogger: {
    editorIframe: ["iframe.tr-rte-editor-frame", "iframe#postingComposeAggregator iframe"],
    titleField: ["input[name='title']", "#postingTitle"],
    bodyField: ["body#tinymce", "[contenteditable='true']"],
    labelInput: ["#label-editor input", "input[aria-label*='라벨']"],
    publishButton: ["#publishButton", "div#publishButtonDiv button"],
  },
};
