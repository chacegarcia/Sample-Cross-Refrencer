/**
 * Suso configurator NL engine — public entry and re-exports.
 * Product field inference is injected via deps (see js/lcm/wire.js + window.SUSO_DEPS).
 */

export { SUSO_PHRASE_PACK_DOCUMENT, SUSO_PHRASE_PACK_CONFIGURATOR } from "./phrase-scan.js";
export { susoWordishBoundaryOk, susoPhraseEntriesForConfigurator, susoCollectPhraseMatches } from "./phrase-scan.js";
export { susoBuildConfiguratorSemanticSlots } from "./semantic-slots.js";
export { parseIntentConfigurator } from "./parse-intent.js";
export {
  SUSO_ADAPTER_IDS_CONFIGURATOR,
  susoClassifyDomainConfigurator,
  susoPickAdapterConfigurator,
  susoListRejectedAdaptersConfigurator,
} from "./domain.js";
export { susoInitIntentShell, susoNormalizeConfiguratorRequest } from "./intent-shell.js";
export { susoRouteConfiguratorInterpretation } from "./router.js";

import { susoCollectPhraseMatches } from "./phrase-scan.js";
import { susoBuildConfiguratorSemanticSlots } from "./semantic-slots.js";
import { parseIntentConfigurator } from "./parse-intent.js";
import { susoClassifyDomainConfigurator } from "./domain.js";
import { susoInitIntentShell } from "./intent-shell.js";
import { susoRouteConfiguratorInterpretation } from "./router.js";

/**
 * @param {string} text
 * @param {{ inferFieldsFromText: function, getCurrentMode: function }} deps
 */
export function interpretIntentRichConfigurator(text, deps) {
  if (!deps || typeof deps.inferFieldsFromText !== "function" || typeof deps.getCurrentMode !== "function") {
    throw new Error("interpretIntentRichConfigurator requires deps: { inferFieldsFromText, getCurrentMode }");
  }
  const trace = [];
  const base = parseIntentConfigurator(text);
  const low = String(text || "").toLowerCase();
  const rich = Object.assign({}, base);
  susoInitIntentShell(rich, trace);

  const phraseMatches = susoCollectPhraseMatches(low);
  rich._phraseMatches = phraseMatches;
  rich.semantic = susoBuildConfiguratorSemanticSlots(low, phraseMatches);

  trace.push({
    t: "phrase_layer",
    chunks: phraseMatches.map((m) => ({
      phrase: m.phrase,
      category: m.category,
      canonical: m.canonical,
      span: [m.start, m.end],
      pack: m.pack || null,
    })),
    semanticSlots: rich.semantic,
  });

  rich._suso.domain = susoClassifyDomainConfigurator(low, rich.semantic, base);
  trace.push({ t: "domain", domain: rich._suso.domain });

  const routed = susoRouteConfiguratorInterpretation(rich, text, low, trace, deps);
  rich.routed = routed;

  trace.push({
    t: "interpretation_path",
    domain: rich._suso.domain,
    adapter: routed.adapter,
    kind: routed.kind,
    rule: routed.rule,
  });
  rich.intentTrace = trace;
  return rich;
}
