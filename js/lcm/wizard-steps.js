import { COL } from "./columns.js";
import { foamRowsByColor, foamRowsByColorThickness, geoRowsByWheel } from "./catalog/foam-catalog.js";
import { wheelsForThickness } from "./catalog/geo-thk.js";
import { norm, normU, uniqSorted, susoSanitizeForBoldEcho } from "./form-state.js";
import {
  matchFoamCatalogColorFromUserText,
  matchOptionFromUserText,
  matchWoolPrintFromUserText,
} from "./match-options.js";
import { susoScrubForFoamColorScan } from "./catalog/foam-infer.js";
import { applyProdType } from "./apply-config.js";
import {
  recomputeFoam,
  recomputeWoolAll,
  recomputeWoolStack,
  resolveFoamRow,
  resolveWoolBase,
  resolveWoolStackFinal,
} from "./foam-wool-ui.js";

export function susoStepShortLabel(stepId) {
  const map = {
    prodType: "product type",
    identity: "request / sample",
    foamColor: "foam color",
    foamThickness: "thickness",
    foamPartColor: "part color",
    foamWheel: "wheel",
    foamPadSize: "pad size",
    foamQty: "quantity",
    foamLoopType: "loop type",
    foamHole: "hole",
    foamNotes: "foam notes",
    woolPadSize: "pad size (Final OD)",
    woolNap: "nap length",
    woolYarn: "yarn",
    woolOrientation: "orientation",
    woolBacking: "backing",
    woolPoly: "poly",
    woolMil: "MIL",
    woolPrint: "print",
    woolNotes: "wool notes",
  };
  return map[stepId] || "";
}

export function tryParseIdentityLine(h, text) {
  const t = norm(text);
  if (!t) return;
  const low = t.toLowerCase();
  let req = null;
  let samp = null;
  const rb = t.match(/(?:requested\s*by|requester)\s*[:\-]?\s*([^,\n]+?)(?:\s*,|\s+sample|\s*$)/i);
  const sn = t.match(/(?:sample\s*name|sample)\s*[:\-]?\s*(.+)$/i);
  if (rb) req = norm(rb[1]);
  if (sn) samp = norm(sn[1]);
  if (!req && !samp) {
    if (t.includes(",")) {
      const p = t.split(",").map((x) => norm(x)).filter(Boolean);
      if (p.length >= 2) {
        req = p[0];
        samp = p.slice(1).join(", ");
      } else req = p[0];
    } else if (!/foam|wool|pad|tufted|loop|hole|inch/i.test(low)) {
      req = t;
    }
  }
  if (req) h.els.reqName.value = req;
  if (samp) h.els.sampleName.value = samp;
}

export function tryApplyStepAnswer(h, text, step) {
  const none = () => ({ applied: false, value: null, step: step || null });
  if (!step || !h.wb) return none();
  const low = norm(text).toLowerCase();
  if (step === "prodType") {
    if (/\bfoam\b/.test(low) && !/\btufted\s+wool\b/.test(low)) {
      applyProdType(h, "foam");
      return { applied: true, value: "Foam pad", step: "prodType" };
    }
    if (/\bwool\b/.test(low) || /\btufted\b/.test(low)) {
      applyProdType(h, "wool");
      return { applied: true, value: "Tufted wool pad", step: "prodType" };
    }
    return none();
  }
  if (step === "identity") {
    const beforeReq = h.els.reqName.value;
    const beforeSamp = h.els.sampleName.value;
    tryParseIdentityLine(h, text);
    if (h.els.reqName.value !== beforeReq || h.els.sampleName.value !== beforeSamp) {
      const parts = [];
      if (h.els.reqName.value) parts.push("requested by " + h.els.reqName.value);
      if (h.els.sampleName.value) parts.push("sample " + h.els.sampleName.value);
      return { applied: true, value: parts.join(", "), step: "identity" };
    }
    return none();
  }

  let opts = [];
  if (step === "foamColor") opts = uniqSorted(h.foamRows, COL.foam_color);
  else if (step === "foamThickness")
    opts = h.els.foamColor.value ? uniqSorted(foamRowsByColor(h.foamRows, h.els.foamColor.value), COL.foam_thickness) : [];
  else if (step === "foamPartColor") {
    opts = Array.from(
      new Set(
        foamRowsByColorThickness(h.foamRows, h.els.foamColor.value, h.els.foamThickness.value)
          .map((r) => norm(r[COL.foam_partColor]))
          .filter(Boolean)
      )
    );
  } else if (step === "foamWheel") {
    opts = wheelsForThickness(h.geoRows, h.els.foamThickness.value);
    if (!opts.length) opts = uniqSorted(h.geoRows, COL.geo_wheel);
  } else if (step === "foamPadSize") {
    opts = uniqSorted(geoRowsByWheel(h.geoRows, h.els.foamWheel.value), COL.geo_padSizes).flatMap((x) =>
      String(x)
        .split(",")
        .map((y) => y.trim())
        .filter(Boolean)
    );
    opts = Array.from(new Set(opts)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } else if (step === "foamLoopType") opts = ["White Loop", "Black Loop", "No Loop"];
  else if (step === "foamHole") opts = ["With Hole", "No Hole"];
  else if (step === "woolPadSize") opts = uniqSorted(h.woolRows, "Final OD");
  else if (step === "woolNap")
    opts = uniqSorted(h.woolRows.filter((r) => normU(r["Final OD"]) === normU(h.els.woolPadSize.value)), "Nap Length");
  else if (step === "woolYarn")
    opts = uniqSorted(
      h.woolRows.filter(
        (r) =>
          normU(r["Final OD"]) === normU(h.els.woolPadSize.value) &&
          normU(r["Nap Length"]) === normU(h.els.woolNap.value)
      ),
      "Yarn"
    );
  else if (step === "woolOrientation") opts = ["Curved", "Flat"];
  else if (step === "woolPrint") opts = ["No Print", "LC Print", "Customer Sample Print"];
  else if (step === "woolBacking") opts = Array.from(h.els.woolBacking.options).map((o) => o.value).filter(Boolean);
  else if (step === "woolPoly") opts = Array.from(h.els.woolPoly.options).map((o) => o.value).filter(Boolean);
  else if (step === "woolMil") opts = Array.from(h.els.woolMil.options).map((o) => o.value).filter(Boolean);

  let pick = opts.length ? matchOptionFromUserText(text, opts) : null;
  if (step === "foamColor" && opts.length) {
    const scrubbedAnswer = susoScrubForFoamColorScan(norm(text).toLowerCase());
    pick = matchFoamCatalogColorFromUserText(scrubbedAnswer, opts);
  } else if (step === "woolPrint" && opts.length) {
    pick = matchWoolPrintFromUserText(text, opts);
  }

  if (step === "foamColor" && pick) {
    h.els.foamColor.value = pick;
    recomputeFoam(h);
    return { applied: true, value: pick, step };
  }
  if (step === "foamThickness" && pick) {
    h.els.foamThickness.value = pick;
    recomputeFoam(h);
    return { applied: true, value: pick, step };
  }
  if (step === "foamPartColor" && pick) {
    h.els.foamPartColor.value = pick;
    recomputeFoam(h);
    return { applied: true, value: pick, step };
  }
  if (step === "foamWheel" && pick) {
    h.els.foamWheel.value = pick;
    recomputeFoam(h);
    return { applied: true, value: pick, step };
  }
  if (step === "foamPadSize" && pick) {
    h.els.foamPadSize.value = pick;
    recomputeFoam(h);
    return { applied: true, value: pick, step };
  }
  if (step === "foamQty") {
    const q = parseInt(String(text).replace(/,/g, "").trim(), 10);
    if (Number.isFinite(q) && q >= 1) {
      h.els.foamQty.value = String(q);
      return { applied: true, value: String(q), step };
    }
    return none();
  }
  if (step === "foamLoopType" && pick) {
    h.els.foamLoopType.value = pick;
    return { applied: true, value: pick, step };
  }
  if (step === "foamHole" && pick) {
    h.els.foamHole.value = pick;
    return { applied: true, value: pick, step };
  }
  if (step === "foamNotes") {
    const v = norm(text);
    if (v) {
      h.els.foamNotes.value = v;
      return { applied: true, value: v.length > 80 ? v.slice(0, 77) + "…" : v, step };
    }
    return none();
  }

  if (step === "woolPadSize" && pick) {
    h.els.woolPadSize.value = pick;
    recomputeWoolAll(h);
    return { applied: true, value: pick, step };
  }
  if (step === "woolNap" && pick) {
    h.els.woolNap.value = pick;
    recomputeWoolAll(h);
    return { applied: true, value: pick, step };
  }
  if (step === "woolYarn" && pick) {
    h.els.woolYarn.value = pick;
    recomputeWoolAll(h);
    return { applied: true, value: pick, step };
  }
  if (step === "woolOrientation" && pick) {
    h.els.woolOrientation.value = pick;
    return { applied: true, value: pick, step };
  }
  if (step === "woolBacking" && pick) {
    h.els.woolBacking.value = pick;
    recomputeWoolStack(h);
    return { applied: true, value: pick, step };
  }
  if (step === "woolPoly" && pick) {
    h.els.woolPoly.value = pick;
    recomputeWoolStack(h);
    return { applied: true, value: pick, step };
  }
  if (step === "woolMil" && pick) {
    h.els.woolMil.value = pick;
    return { applied: true, value: pick, step };
  }
  if (step === "woolPrint" && pick) {
    h.els.woolPrint.value = pick;
    return { applied: true, value: pick, step };
  }
  if (step === "woolNotes") {
    const v = norm(text);
    if (v) {
      h.els.woolNotes.value = v;
      return { applied: true, value: v.length > 80 ? v.slice(0, 77) + "…" : v, step };
    }
    return none();
  }
  return none();
}

export function getNextMissingSlot(h) {
  if (!h.wb) return { stepId: "need_load", prompt: "Load the catalog first (button above).", options: [] };

  if (h.currentMode === null) {
    return {
      stepId: "prodType",
      prompt: "First, which are you configuring? **Foam pad** or **tufted wool** pad?",
      options: ["Foam pad", "Tufted wool pad"],
    };
  }

  if (!h.hasAnyName()) {
    return {
      stepId: "identity",
      prompt:
        "Who should we list as **requested by**, and what **sample name** (if any)? You can answer like: `Requested by: Jane Doe, Sample: Red test`.",
      allowFreeText: true,
      options: [],
    };
  }

  if (h.currentMode === "foam") {
    if (!h.els.foamColor.value) {
      return { stepId: "foamColor", prompt: "Which **foam color**?", options: uniqSorted(h.foamRows, COL.foam_color) };
    }
    if (!h.els.foamThickness.value) {
      return {
        stepId: "foamThickness",
        prompt: "Which **thickness**?",
        options: uniqSorted(foamRowsByColor(h.foamRows, h.els.foamColor.value), COL.foam_thickness),
      };
    }
    const needPart = !h.els.foamPartColorRow.classList.contains("hidden");
    if (needPart && !h.els.foamPartColor.value) {
      const pcs = Array.from(
        new Set(
          foamRowsByColorThickness(h.foamRows, h.els.foamColor.value, h.els.foamThickness.value)
            .map((r) => norm(r[COL.foam_partColor]))
            .filter(Boolean)
        )
      );
      return {
        stepId: "foamPartColor",
        prompt: "Which **part color** (foam part) applies?",
        options: pcs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      };
    }
    if (!h.els.foamWheel.value) {
      const wopts = wheelsForThickness(h.geoRows, h.els.foamThickness.value);
      return {
        stepId: "foamWheel",
        prompt: "Which **wheel**?",
        options: wopts.length ? wopts : uniqSorted(h.geoRows, COL.geo_wheel),
      };
    }
    if (!h.els.foamPadSize.value) {
      const pads = uniqSorted(geoRowsByWheel(h.geoRows, h.els.foamWheel.value), COL.geo_padSizes).flatMap((x) =>
        String(x)
          .split(",")
          .map((y) => y.trim())
          .filter(Boolean)
      );
      const padUnique = Array.from(new Set(pads)).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      return { stepId: "foamPadSize", prompt: "Which **pad size**?", options: padUnique };
    }
    const qty = parseInt(h.els.foamQty.value || "0", 10);
    if (!Number.isFinite(qty) || qty < 1) {
      return { stepId: "foamQty", prompt: "What **quantity** (minimum 1)?", options: [] };
    }
    if (!h.els.foamLoopType.value) {
      return { stepId: "foamLoopType", prompt: "Which **loop type**?", options: ["White Loop", "Black Loop", "No Loop"] };
    }
    if (!h.els.foamHole.value) {
      return { stepId: "foamHole", prompt: "**Finished pad** — with hole or no hole?", options: ["With Hole", "No Hole"] };
    }
    if (!resolveFoamRow(h)) {
      return {
        stepId: "foam_resolve",
        prompt: "Foam part is still ambiguous. Try adjusting **color**, **thickness**, or **part color** so one BOM row matches.",
        options: [],
      };
    }
    return {
      stepId: "complete",
      prompt:
        "**Configuration complete.** Say **export** or tap **Download BOM** to save the spreadsheet. (You can add **notes** in chat anytime before exporting.)",
      options: [],
    };
  }

  if (h.currentMode === "wool") {
    if (!h.els.woolPadSize.value) {
      return {
        stepId: "woolPadSize",
        prompt:
          "What **final pad size (Final OD)**? Type the size (e.g. **3** or **5.5**). For a **numbered** list below, use **#3** for line 3.",
        options: uniqSorted(h.woolRows, "Final OD"),
      };
    }
    if (!h.els.woolNap.value) {
      return {
        stepId: "woolNap",
        prompt: "Which **nap length**?",
        options: uniqSorted(h.woolRows.filter((r) => normU(r["Final OD"]) === normU(h.els.woolPadSize.value)), "Nap Length"),
      };
    }
    if (!h.els.woolYarn.value) {
      return {
        stepId: "woolYarn",
        prompt: "Which **yarn**?",
        options: uniqSorted(
          h.woolRows.filter(
            (r) =>
              normU(r["Final OD"]) === normU(h.els.woolPadSize.value) &&
              normU(r["Nap Length"]) === normU(h.els.woolNap.value)
          ),
          "Yarn"
        ),
      };
    }
    if (!h.els.woolOrientation.value) {
      return { stepId: "woolOrientation", prompt: "**Orientation** — curved or flat?", options: ["Curved", "Flat"] };
    }
    recomputeWoolStack(h);
    if (!h.els.woolBacking.value) {
      const backOpts = Array.from(h.els.woolBacking.options).map((o) => o.value).filter(Boolean);
      return {
        stepId: "woolBacking",
        prompt: "Which **backing type**?",
        options: backOpts.length ? backOpts : ["Loop", "Canvas"],
      };
    }
    if (!h.els.woolPoly.value) {
      const polyOpts = Array.from(h.els.woolPoly.options).map((o) => o.value).filter(Boolean);
      return { stepId: "woolPoly", prompt: "Which **poly type**?", options: polyOpts };
    }
    if (!h.els.woolMil.value) {
      const milOpts = Array.from(h.els.woolMil.options).map((o) => o.value).filter(Boolean);
      return { stepId: "woolMil", prompt: "Which **MIL (sturdyness)**?", options: milOpts };
    }
    if (!h.els.woolPrint.value) {
      return {
        stepId: "woolPrint",
        prompt:
          "Which **print**? You can say **no print**, **LC print**, or **my logo** / **custom print** (customer-supplied artwork).",
        options: ["No Print", "LC Print", "Customer Sample Print"],
      };
    }
    if (!resolveWoolBase(h) || !resolveWoolStackFinal(h)) {
      return {
        stepId: "wool_resolve",
        prompt:
          "That combination doesn’t narrow to one stack row yet. Try different **backing / poly / MIL** choices that appear in the list.",
        options: [],
      };
    }
    return { stepId: "complete", prompt: "**Configuration complete.** Say **export** or tap **Download BOM**.", options: [] };
  }

  return { stepId: "complete", prompt: "**Done.** Say **export** to download.", options: [] };
}

export function susoApplyStepValue(h, stepId, value) {
  const v = norm(value);
  if (!v || !stepId) return false;
  if (stepId === "foamColor") {
    h.els.foamColor.value = v;
    recomputeFoam(h);
    return true;
  }
  if (stepId === "foamThickness") {
    h.els.foamThickness.value = v;
    recomputeFoam(h);
    return true;
  }
  if (stepId === "foamPartColor") {
    h.els.foamPartColor.value = v;
    recomputeFoam(h);
    return true;
  }
  if (stepId === "foamWheel") {
    h.els.foamWheel.value = v;
    recomputeFoam(h);
    return true;
  }
  if (stepId === "foamPadSize") {
    h.els.foamPadSize.value = v;
    recomputeFoam(h);
    return true;
  }
  if (stepId === "foamLoopType") {
    h.els.foamLoopType.value = v;
    return true;
  }
  if (stepId === "foamHole") {
    h.els.foamHole.value = v;
    return true;
  }
  if (stepId === "foamQty") {
    const q = parseInt(v, 10);
    if (!Number.isFinite(q) || q < 1) return false;
    h.els.foamQty.value = String(q);
    return true;
  }
  if (stepId === "woolPadSize") {
    h.els.woolPadSize.value = v;
    recomputeWoolAll(h);
    return true;
  }
  if (stepId === "woolNap") {
    h.els.woolNap.value = v;
    recomputeWoolAll(h);
    return true;
  }
  if (stepId === "woolYarn") {
    h.els.woolYarn.value = v;
    recomputeWoolAll(h);
    return true;
  }
  if (stepId === "woolOrientation") {
    h.els.woolOrientation.value = v;
    return true;
  }
  if (stepId === "woolBacking") {
    h.els.woolBacking.value = v;
    recomputeWoolStack(h);
    return true;
  }
  if (stepId === "woolPoly") {
    h.els.woolPoly.value = v;
    recomputeWoolStack(h);
    return true;
  }
  if (stepId === "woolMil") {
    h.els.woolMil.value = v;
    return true;
  }
  if (stepId === "woolPrint") {
    h.els.woolPrint.value = v;
    return true;
  }
  return false;
}

export function susoStepAllowsAutoSingle(stepId) {
  return (
    stepId === "foamColor" ||
    stepId === "foamThickness" ||
    stepId === "foamPartColor" ||
    stepId === "foamWheel" ||
    stepId === "foamPadSize" ||
    stepId === "foamLoopType" ||
    stepId === "foamHole" ||
    stepId === "woolPadSize" ||
    stepId === "woolNap" ||
    stepId === "woolYarn" ||
    stepId === "woolOrientation" ||
    stepId === "woolBacking" ||
    stepId === "woolPoly" ||
    stepId === "woolMil" ||
    stepId === "woolPrint"
  );
}

export function susoAutoFillSingleOptionSteps(h, getNextMissingSlotFn) {
  const lines = [];
  for (let g = 0; g < 24; g++) {
    const slot = getNextMissingSlotFn();
    if (["complete", "need_load", "prodType", "identity", "foam_resolve", "wool_resolve"].indexOf(slot.stepId) >= 0) break;
    if (!slot.options || slot.options.length !== 1) break;
    if (!susoStepAllowsAutoSingle(slot.stepId)) break;
    const only = slot.options[0];
    if (!susoApplyStepValue(h, slot.stepId, only)) break;
    if (h.currentMode === "wool") recomputeWoolStack(h);
    const lab = susoStepShortLabel(slot.stepId);
    lines.push("Only one option for **" + (lab || slot.stepId) + "** — set to **" + susoSanitizeForBoldEcho(only) + "**.");
  }
  return lines;
}
