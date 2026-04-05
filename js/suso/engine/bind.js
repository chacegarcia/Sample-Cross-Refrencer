/**
 * Binds engine entry to window after the main app script defines window.SUSO_DEPS.
 * Must load after the inline script that sets SUSO_DEPS.{ inferFieldsFromText, getCurrentMode }.
 */
import * as SusoEngine from "./index.js";

window.SusoEngine = SusoEngine;
window.interpretIntentRichConfigurator = function (text) {
  return SusoEngine.interpretIntentRichConfigurator(text, window.SUSO_DEPS);
};
