import { norm, susoNormalizeNumericText, toNum } from "./form-state.js";
import { susoCatalogColorPhraseMatchesHay } from "./catalog/foam-infer.js";
import { susoResolveWoolPrintIntentPhrase } from "./catalog/wool-infer.js";

/**
 * Match user text to a list option: #3 / option 3 = position; bare 3 = option whose *value* is 3
 */
export function susoMatchListOptionCore(low, options) {
  if (!options || !options.length) return null;
  const l = String(low || "").toLowerCase();

  const mHash = /^\s*#\s*(\d+)\s*$/.exec(l);
  if (mHash) {
    const i = parseInt(mHash[1], 10) - 1;
    if (i >= 0 && i < options.length) return options[i];
  }
  const mOpt = /^\s*(?:option|pick)\s*#?\s*(\d+)\s*$/i.exec(l);
  if (mOpt) {
    const i = parseInt(mOpt[1], 10) - 1;
    if (i >= 0 && i < options.length) return options[i];
  }

  for (const o of options) {
    const ou = norm(o).toLowerCase();
    if (l === ou || ou === l) return o;
  }

  const numOnly = /^\s*(-?\d+(?:\.\d+)?|-?\.\d+)\s*$/i.exec(l);
  if (numOnly) {
    const trimmed = numOnly[0].trim();
    const want = toNum(trimmed);
    if (want != null) {
      const valHits = options.filter((o) => {
        const on = toNum(o);
        if (on != null && Math.abs(on - want) < 1e-9) return true;
        return norm(o).toLowerCase() === l;
      });
      if (valHits.length) return valHits[0];
    }
    if (/^-?\d+$/.test(trimmed)) {
      const asInt = parseInt(trimmed, 10);
      if (asInt >= 1 && asInt <= options.length) return options[asInt - 1];
    }
  }
  return null;
}

export function matchOptionFromUserText(text, options) {
  if (!options || !options.length) return null;
  const low = susoNormalizeNumericText(norm(text)).toLowerCase();
  const core = susoMatchListOptionCore(low, options);
  if (core) return core;
  for (const o of options) {
    const ou = norm(o).toLowerCase();
    if (low.includes(ou) || ou.includes(low)) return o;
  }
  return null;
}

/** Foam catalog colors: prefer longest match; composite ORANGE/GREY beats GREY for "orange grey". */
export function matchFoamCatalogColorFromUserText(text, options) {
  if (!options || !options.length) return null;
  const low = susoNormalizeNumericText(norm(text)).toLowerCase();
  const core = susoMatchListOptionCore(low, options);
  if (core) return core;
  const sorted = options.slice().sort((a, b) => norm(b).length - norm(a).length);
  for (const o of sorted) {
    if (susoCatalogColorPhraseMatchesHay(low, o)) return o;
  }
  return null;
}

export function matchWoolPrintFromUserText(text, options) {
  if (!options || !options.length) return null;
  const low = susoNormalizeNumericText(norm(text)).toLowerCase();
  const core = susoMatchListOptionCore(low, options);
  if (core) return core;
  const resolved = susoResolveWoolPrintIntentPhrase(low);
  if (resolved) {
    const hit = options.find((o) => norm(o).toLowerCase() === resolved.toLowerCase());
    if (hit) return hit;
  }
  return matchOptionFromUserText(text, options);
}
