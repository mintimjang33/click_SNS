const selectors = require("../selectors").gemini;
const { createAiAutomation } = require("./automation");

const automation = createAiAutomation(selectors);
const URL = "https://gemini.google.com/app";

module.exports = { ...automation, URL };
