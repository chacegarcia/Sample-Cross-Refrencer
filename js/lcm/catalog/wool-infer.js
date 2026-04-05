import { pickMatchingOption, norm, toNum } from "../form-state.js";
import { susoExtractNumbersForFoam } from "./foam-infer.js";

export function susoMatchWoolOdToCatalog(n, ods) {
  if (n == null || !ods || !ods.length) return null;
  const hit =
    pickMatchingOption(String(n), ods) ||
    ods.find((o) => toNum(o) != null && Math.abs(toNum(o) - Number(n)) < 1e-6);
  return hit || null;
}

/**
 * Final OD from one utterance: prefer explicit inches / labels over a bare number (ambiguous).
 */
export function susoInferWoolPadSizeFromContext(low, raw, ods) {
  const r = String(raw || "");
  const l = String(low || "");
  if (!ods.length) return null;

  const mInch = /\b(\d+(?:\.\d+)?)\s*(?:inch|inches|in\.?|")\b/i.exec(r);
  if (mInch) {
    const v = parseFloat(mInch[1]);
    if (Number.isFinite(v) && v >= 1 && v <= 64) {
      const hit = susoMatchWoolOdToCatalog(v, ods);
      if (hit) return { value: hit, confidence: "high" };
    }
  }

  const mLabel = /\b(?:final\s*od|final\s+od|pad\s*size|diameter)\s*[:\s]*(\d+(?:\.\d+)?)\b/i.exec(l);
  if (mLabel) {
    const v = parseFloat(mLabel[1]);
    if (Number.isFinite(v) && v >= 1 && v <= 64) {
      const hit = susoMatchWoolOdToCatalog(v, ods);
      if (hit) return { value: hit, confidence: "high" };
    }
  }

  const nums = susoExtractNumbersForFoam(l);
  if (nums.length >= 1) {
    const v = nums[0].value;
    if (v >= 1 && v <= 64) {
      const hit = susoMatchWoolOdToCatalog(v, ods);
      if (hit) return { value: hit, confidence: "low" };
    }
  }
  return null;
}

/**
 * Map loose customer wording to catalog print options (tufted wool).
 */
export function susoResolveWoolPrintIntentPhrase(low) {
  const l = String(low || "").toLowerCase();
  if (!l.trim()) return null;
  if (/\b(no\s+print|without\s+print|unprinted)\b/i.test(l)) return "No Print";
  if (/\bno\s+logo\b/i.test(l)) return "No Print";
  if (/\blc\s+print\b/i.test(l)) return "LC Print";
  if (/^\s*lc\s*$/i.test(l.trim())) return "LC Print";
  if (
    /\b(my\s+logo|our\s+logo|their\s+logo|customer\s+logo|custom\s+print|my\s+custom\s+print|my\s+custom\b|customer\s+sample|customer\s+art|supplied\s+art|branded|custom\s+artwork|artwork\s+from\s+customer|their\s+artwork)\b/i.test(
      l
    )
  )
    return "Customer Sample Print";
  if (/\b(logo|artwork)\b/i.test(l) && !/\bno\s+(print|logo)\b/i.test(l)) return "Customer Sample Print";
  return null;
}
