const selectors = require("../selectors").chatgpt;
const { createAiAutomation } = require("./automation");

const automation = createAiAutomation(selectors);
const URL = "https://chatgpt.com/";

module.exports = { ...automation, URL };
