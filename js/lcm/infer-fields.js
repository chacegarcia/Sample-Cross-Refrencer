import { COL } from "./columns.js";
import { foamRowsByColor, geoRowsByWheel } from "./catalog/foam-catalog.js";
import {
  susoExtractRequestedBy,
  susoExtractNumbersForFoam,
  susoScrubForFoamColorScan,
  susoInferFoamThicknessAndPad,
  susoMatchFoamCatalogColor,
  susoInferFoamThicknessWhenUniqueForColorAndWheel,
} from "./catalog/foam-infer.js";
import { susoInferWoolPadSizeFromContext, susoResolveWoolPrintIntentPhrase } from "./catalog/wool-infer.js";
import { norm, normU, toNum, uniqSorted, splitMaybeComma } from "./form-state.js";
import { matchOptionFromUserText } from "./match-options.js";

/**
 * @param {{
 *   getFoamRows: () => object[],
 *   getGeoRows: () => object[],
 *   getWoolRows: () => object[],
 *   getCurrentMode: () => string|null,
 *   getEls: () => object,
 * }} host
 */
export function createInferFieldsFromText(host) {
  return function susoInferFieldsFromText(low, raw, semantic, phraseMatches) {
    const foamRows = host.getFoamRows();
    const geoRows = host.getGeoRows();
    const woolRows = host.getWoolRows();
    const currentMode = host.getCurrentMode();
    const els = host.getEls();

    const fields = {};
    const notes = [];
    const clarifications = [];
    const confirmations = [];

    const rb = susoExtractRequestedBy(low, raw);
    if (rb) fields.reqName = rb;

    if (semantic.productType === "foam") fields.prodType = "foam";
    if (semantic.productType === "wool") fields.prodType = "wool";
    if (/\bfoam\b/.test(low) && !semantic.productType) fields.prodType = "foam";
    if (/\btufted\b/.test(low) && /\bwool\b/.test(low)) fields.prodType = "wool";

    if (semantic.loopType) fields.foamLoopType = semantic.loopType;
    if (semantic.finishedPad) fields.foamHole = semantic.finishedPad;
    if (semantic.orientation) fields.woolOrientation = semantic.orientation;
    if (semantic.printType) fields.woolPrint = semantic.printType;

    const lowForFoamColor = susoScrubForFoamColorScan(low);
    const matchedFoamColor = susoMatchFoamCatalogColor(foamRows, lowForFoamColor);
    if (matchedFoamColor) fields.foamColor = matchedFoamColor;

    const nums = susoExtractNumbersForFoam(low);
    const woolish =
      semantic.productType === "wool" ||
      fields.prodType === "wool" ||
      /\btufted\s+wool\b|\bwool\s+pad\b/.test(low) ||
      (/\bwool\b/.test(low) && !/\bfoam\s+pad\b/.test(low) && !/\bfoam\b/.test(low));

    if (!fields.woolPrint && (woolish || currentMode === "wool")) {
      const wp = susoResolveWoolPrintIntentPhrase(low);
      if (wp) fields.woolPrint = wp;
    }

    if (!woolish && (fields.prodType === "foam" || currentMode === "foam" || /\bfoam\b/.test(low))) {
      susoInferFoamThicknessAndPad(low, raw, nums, fields);
      if (fields._thicknessNum != null && fields._thicknessNum >= 2.25) {
        fields._padNum = fields._thicknessNum;
        delete fields._thicknessNum;
      }
    }

    if (!woolish && geoRows.length && (fields.prodType === "foam" || currentMode === "foam" || /\bfoam\b/.test(low))) {
      const wheels = uniqSorted(geoRows, COL.geo_wheel)
        .slice()
        .sort((a, b) => norm(b).length - norm(a).length);
      const wPick = matchOptionFromUserText(low, wheels);
      if (wPick) fields.foamWheel = wPick;
    }

    if (fields._thicknessNum != null && foamRows.length) {
      const thkOpts = fields.foamColor
        ? uniqSorted(foamRowsByColor(foamRows, fields.foamColor), COL.foam_thickness)
        : uniqSorted(foamRows, COL.foam_thickness);
      const matchThk = thkOpts
        .map((t) => ({ t, n: toNum(t) }))
        .find((o) => o.n !== null && Math.abs(o.n - fields._thicknessNum) < 1e-6);
      if (matchThk) fields.foamThickness = matchThk.t;
      else if (fields._thicknessNum < 2.5) {
        notes.push("Thickness " + fields._thicknessNum + " not in current option list (after color context).");
        clarifications.push("Pick thickness from the list or adjust color first.");
      }
    }

    if (!woolish && foamRows.length && geoRows.length) {
      susoInferFoamThicknessWhenUniqueForColorAndWheel(foamRows, fields, (w) =>
        host.thicknessesForWheel(geoRows, w)
      );
    }

    let woolOdMeta = null;
    if (woolish && woolRows.length) {
      const ods = uniqSorted(woolRows, "Final OD");
      woolOdMeta = susoInferWoolPadSizeFromContext(low, raw, ods);
      if (woolOdMeta) fields.woolPadSize = woolOdMeta.value;
    }

    if (!fields.woolOrientation && woolish) {
      if (/\bcurved\b/i.test(low)) fields.woolOrientation = "Curved";
      else if (/\bflat\b/i.test(low)) fields.woolOrientation = "Flat";
    }

    if (!woolish && fields._padNum != null && geoRows.length && fields._padNum < 72) {
      const wheelRef = fields.foamWheel || els.foamWheel.value;
      const pads = wheelRef
        ? splitMaybeComma(uniqSorted(geoRowsByWheel(geoRows, wheelRef), COL.geo_padSizes).join(","))
        : [...new Set(geoRows.flatMap((r) => splitMaybeComma(r[COL.geo_padSizes])))];
      const asStr = String(fields._padNum);
      const hit =
        pads.find((p) => Math.abs(toNum(p) - fields._padNum) < 1e-6 || normU(p) === normU(asStr)) ||
        pads.find((p) => norm(p).includes(asStr));
      if (hit) fields.foamPadSize = hit;
      else if (fields._padNum <= 24) {
        notes.push("Pad size " + fields._padNum + " not matched yet (pick **wheel** first if you haven’t).");
        clarifications.push("We’ll confirm pad size after wheel.");
      }
    }

    for (const m of phraseMatches) {
      if (m.category === "loop_type" && m.canonical) fields.foamLoopType = m.canonical;
      if (m.category === "finished_pad" && m.canonical) fields.foamHole = m.canonical;
    }

    if (/white\s+loop|black\s+loop|no\s+loop/i.test(raw) && !fields.foamLoopType) {
      if (/white\s+loop/i.test(raw)) fields.foamLoopType = "White Loop";
      else if (/black\s+loop/i.test(raw)) fields.foamLoopType = "Black Loop";
      else if (/no\s+loop/i.test(raw)) fields.foamLoopType = "No Loop";
    }
    if (/\bno\s+hole\b/i.test(raw)) fields.foamHole = "No Hole";
    if (/\bwith\s+hole\b/i.test(raw)) fields.foamHole = "With Hole";

    if (woolish && woolRows.length) {
      const bits = [];
      if (fields.woolPadSize && woolOdMeta) {
        if (woolOdMeta.confidence === "low") {
          bits.push(
            "**Final OD " +
              fields.woolPadSize +
              "** (best guess from a number — say **no** or the correct size if not)"
          );
        } else {
          bits.push("**Final OD " + fields.woolPadSize + "**");
        }
      }
      if (fields.woolOrientation && !semantic.orientation && /\b(curved|flat)\b/i.test(low)) {
        bits.push("**orientation " + fields.woolOrientation + "** (from “curved” / “flat” in your text)");
      }
      const multiField = (fields.woolPadSize ? 1 : 0) + (fields.woolOrientation ? 1 : 0) >= 2;
      const tentativeOd = woolOdMeta && woolOdMeta.confidence === "low";
      const orientFromText = fields.woolOrientation && !semantic.orientation && /\b(curved|flat)\b/i.test(low);
      if (bits.length && (multiField || tentativeOd || orientFromText)) {
        confirmations.push("From your message I’m using " + bits.join(" and ") + ". **Tell me if any of that’s wrong.**");
      }
    }

    if (!woolish && (fields.foamWheel || fields.foamPadSize)) {
      const bits = [];
      if (fields.foamWheel) bits.push("**wheel " + String(fields.foamWheel).replace(/\*+/g, "") + "**");
      if (fields.foamPadSize) bits.push("**pad " + String(fields.foamPadSize).replace(/\*+/g, "") + "**");
      if (bits.length) {
        confirmations.push("From your message I’m using " + bits.join(" and ") + " for foam. **Tell me if any of that’s wrong.**");
      }
    }

    return { fields, notes, clarifications, confirmations };
  };
}
