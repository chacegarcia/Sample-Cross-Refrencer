import { COL } from "../columns.js";
import { foamRowsByColor } from "./foam-catalog.js";
import { norm, normU, toNum, uniqSorted, susoNormalizeNumericText } from "../form-state.js";

export function susoExtractRequestedBy(low, raw) {
  let m = raw.match(/\b(?:requested by|requester|set requested by)\s*[:\-]?\s*(.+)$/i);
  if (m) return m[1].trim();
  m = low.match(/\bset\s+requested\s+by\s+(.+)$/);
  if (m) return m[1].trim().replace(/\s+/g, " ");
  return null;
}

export function susoExtractNumbersForFoam(low) {
  const s = susoNormalizeNumericText(low);
  const nums = [];
  const re = /\b(\d+(?:\.\d+)?)\b/gi;
  let x;
  while ((x = re.exec(s)) !== null) {
    const n = parseFloat(x[1]);
    if (Number.isFinite(n)) nums.push({ value: n, index: x.index });
  }
  return nums;
}

/**
 * Infer _thicknessNum vs _padNum using context (inch/pad/thick keywords and magnitude).
 */
export function susoInferFoamThicknessAndPad(low, raw, nums, fields) {
  const r = susoNormalizeNumericText(String(raw || "")).toLowerCase();

  const inchPadMatch = /\b(\d+(?:\.\d+)?)\s*(?:inch|inches|in\b|"|')\b/i.exec(r);
  if (inchPadMatch) {
    const v = parseFloat(inchPadMatch[1]);
    if (Number.isFinite(v) && v >= 1) {
      fields._padNum = v;
      return;
    }
  }

  if (!nums.length) return;

  if (nums.length >= 2) {
    const vals = nums.map((n) => n.value).sort((a, b) => a - b);
    const sm = vals[0];
    const lg = vals[vals.length - 1];
    if (sm < 2.25 && lg >= 2) {
      fields._thicknessNum = sm;
      fields._padNum = lg;
      return;
    }
  }

  if (nums.length === 1) {
    const v = nums[0].value;
    if (v >= 2.25 && v <= 48) {
      fields._padNum = v;
      return;
    }
    if (v > 0 && v < 2.25) {
      fields._thicknessNum = v;
      return;
    }
  }
}

export function susoScrubForFoamColorScan(s) {
  return String(s || "")
    .replace(/\bwhite\s+loop\b/gi, " ")
    .replace(/\bblack\s+loop\b/gi, " ")
    .replace(/\bno\s+loop\b/gi, " ")
    .replace(/\bwith\s+hole\b/gi, " ")
    .replace(/\bno\s+hole\b/gi, " ")
    .replace(/\bno\s+print\b/gi, " ")
    .replace(/\blc\s+print\b/gi, " ")
    .replace(/\bcustomer\s+sample\s+print\b/gi, " ")
    .replace(/\bcurved\b/gi, " ")
    .replace(/\bflat\b/gi, " ")
    .replace(/\bloop\s+backing\b/gi, " ")
    .replace(/\bcanvas\s+backing\b/gi, " ");
}

export function susoEscapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function susoCatalogColorPhraseMatchesHay(hay, catalogColor) {
  const hayLow = String(hay || "").toLowerCase();
  const lc = norm(catalogColor).toLowerCase();
  if (!lc || lc.length < 2) return false;
  if (lc.includes("/")) {
    const parts = lc.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return false;
    const slashFlex = parts.map((p) => susoEscapeRe(p)).join("\\s*\\/\\s*");
    if (new RegExp(slashFlex, "i").test(hayLow)) return true;
    if (parts.length === 2) {
      const [a, b] = parts;
      const s1 = "\\b" + susoEscapeRe(a) + "\\b\\s+\\b" + susoEscapeRe(b) + "\\b";
      const s2 = "\\b" + susoEscapeRe(b) + "\\b\\s+\\b" + susoEscapeRe(a) + "\\b";
      if (new RegExp(s1, "i").test(hayLow) || new RegExp(s2, "i").test(hayLow)) return true;
    } else {
      const spacePat = parts.map((p) => "\\b" + susoEscapeRe(p) + "\\b").join("\\s+");
      if (new RegExp(spacePat, "i").test(hayLow)) return true;
    }
    return false;
  }
  return new RegExp("\\b" + susoEscapeRe(lc) + "\\b", "i").test(hayLow);
}

export function susoMatchFoamCatalogColor(foamRows, lowScrubbed) {
  if (!foamRows.length || !String(lowScrubbed || "").trim()) return null;
  const colors = uniqSorted(foamRows, COL.foam_color)
    .slice()
    .sort((a, b) => norm(b).length - norm(a).length);
  const hay = String(lowScrubbed);
  for (const c of colors) {
    if (susoCatalogColorPhraseMatchesHay(hay, c)) return c;
  }
  return null;
}

export function susoInferFoamThicknessWhenUniqueForColorAndWheel(foamRows, fields, thicknessesForWheelFn) {
  if (fields.foamThickness || !fields.foamWheel || !fields.foamColor) return;
  const nums = thicknessesForWheelFn(fields.foamWheel);
  if (!nums.length) return;
  const foamOpts = uniqSorted(foamRowsByColor(foamRows, fields.foamColor), COL.foam_thickness);
  const candidates = foamOpts.filter((t) => {
    const n = toNum(t);
    return n !== null && nums.some((bw) => Math.abs(bw - n) < 1e-9);
  });
  if (candidates.length === 1) fields.foamThickness = candidates[0];
}
