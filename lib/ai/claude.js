const selectors = require("../selectors").claude;
const { createAiAutomation } = require("./automation");

const automation = createAiAutomation(selectors);
const URL = "https://claude.ai/new";

module.exports = { ...automation, URL };
