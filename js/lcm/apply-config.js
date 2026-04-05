import { COL } from "./columns.js";
import { foamRowsByColor, foamRowsByColorThickness, geoRowsByWheel } from "./catalog/foam-catalog.js";
import { norm, normU, uniqSorted, splitMaybeComma } from "./form-state.js";
import {
  recomputeFoam,
  recomputeWoolAll,
  recomputeWoolStack,
  updateMode,
  resolveFoamRow,
  resolveWoolBase,
  resolveWoolStackFinal,
} from "./foam-wool-ui.js";

export function applyProdType(h, pt) {
  if (pt === "foam") document.getElementById("ptFoam").checked = true;
  else if (pt === "wool") document.getElementById("ptWool").checked = true;
  updateMode(h);
}

export function applyConfiguratorFields(h, partial) {
  const applied = {};
  const skipped = {};

  const setIf = (key, el, val, list) => {
    if (val == null || val === "") return;
    if (list && list.length && !list.some((o) => normU(o) === normU(val))) {
      skipped[key] = val;
      return;
    }
    el.value = val;
    applied[key] = val;
  };

  if (partial.reqName != null) h.els.reqName.value = partial.reqName;
  if (partial.sampleName != null) h.els.sampleName.value = partial.sampleName;

  if (partial.prodType) {
    applyProdType(h, partial.prodType);
  }

  if (h.currentMode === "foam") {
    setIf("foamColor", h.els.foamColor, partial.foamColor, uniqSorted(h.foamRows, COL.foam_color));
    recomputeFoam(h);
    setIf(
      "foamThickness",
      h.els.foamThickness,
      partial.foamThickness,
      uniqSorted(foamRowsByColor(h.foamRows, h.els.foamColor.value), COL.foam_thickness)
    );
    recomputeFoam(h);
    if (!h.els.foamPartColorRow.classList.contains("hidden")) {
      const pcs = Array.from(
        new Set(
          foamRowsByColorThickness(h.foamRows, h.els.foamColor.value, h.els.foamThickness.value)
            .map((r) => norm(r[COL.foam_partColor]))
            .filter(Boolean)
        )
      );
      setIf("foamPartColor", h.els.foamPartColor, partial.foamPartColor, pcs);
    }
    recomputeFoam(h);
    setIf("foamWheel", h.els.foamWheel, partial.foamWheel, uniqSorted(h.geoRows, COL.geo_wheel));
    recomputeFoam(h);
    const padOpts = uniqSorted(geoRowsByWheel(h.geoRows, h.els.foamWheel.value), COL.geo_padSizes).flatMap(splitMaybeComma);
    setIf("foamPadSize", h.els.foamPadSize, partial.foamPadSize, padOpts);
    setIf("foamLoopType", h.els.foamLoopType, partial.foamLoopType, ["White Loop", "Black Loop", "No Loop"]);
    setIf("foamHole", h.els.foamHole, partial.foamHole, ["With Hole", "No Hole"]);
    if (partial.foamQty != null) {
      const q = parseInt(String(partial.foamQty), 10);
      if (Number.isFinite(q) && q >= 1) h.els.foamQty.value = String(q);
    }
    if (partial.foamNotes != null) h.els.foamNotes.value = partial.foamNotes;
  } else {
    setIf("woolPadSize", h.els.woolPadSize, partial.woolPadSize, uniqSorted(h.woolRows, "Final OD"));
    recomputeWoolAll(h);
    setIf(
      "woolNap",
      h.els.woolNap,
      partial.woolNap,
      uniqSorted(
        h.woolRows.filter((r) => normU(r["Final OD"]) === normU(h.els.woolPadSize.value)),
        "Nap Length"
      )
    );
    recomputeWoolAll(h);
    setIf(
      "woolYarn",
      h.els.woolYarn,
      partial.woolYarn,
      uniqSorted(
        h.woolRows.filter(
          (r) =>
            normU(r["Final OD"]) === normU(h.els.woolPadSize.value) &&
            normU(r["Nap Length"]) === normU(h.els.woolNap.value)
        ),
        "Yarn"
      )
    );
    recomputeWoolAll(h);
    setIf("woolOrientation", h.els.woolOrientation, partial.woolOrientation, ["Curved", "Flat"]);
    recomputeWoolStack(h);
    const backOpts = Array.from(h.els.woolBacking.options).map((o) => o.value).filter(Boolean);
    setIf("woolBacking", h.els.woolBacking, partial.woolBacking, backOpts);
    recomputeWoolStack(h);
    const polyOpts = Array.from(h.els.woolPoly.options).map((o) => o.value).filter(Boolean);
    setIf("woolPoly", h.els.woolPoly, partial.woolPoly, polyOpts);
    recomputeWoolStack(h);
    const milOpts = Array.from(h.els.woolMil.options).map((o) => o.value).filter(Boolean);
    setIf("woolMil", h.els.woolMil, partial.woolMil, milOpts);
    setIf("woolPrint", h.els.woolPrint, partial.woolPrint, ["No Print", "LC Print", "Customer Sample Print"]);
    if (partial.woolNotes != null) h.els.woolNotes.value = partial.woolNotes;
  }

  h.clearMissing();
  if (h.currentMode === "foam") recomputeFoam(h);
  else recomputeWoolAll(h);

  return { applied, skipped };
}

export function explainConfiguratorInvalid(h) {
  if (h.currentMode === "wool") {
    const base = resolveWoolBase(h);
    const stack = resolveWoolStackFinal(h);
    const parts = [];
    if (!h.els.woolPadSize.value || !h.els.woolNap.value || !h.els.woolYarn.value)
      parts.push("Select Final OD, Nap, and Yarn first.");
    if (!base) parts.push("The selected OD / Nap / Yarn does not resolve to a single wool base row.");
    if (base && !stack)
      parts.push(
        "Backing / Poly / MIL do not narrow to exactly one stack row for this tufted diameter — adjust Loop vs Canvas and Poly/MIL."
      );
    if (!parts.length) parts.push("Current wool selections resolve; run export to confirm.");
    return parts.join(" ");
  }
  const foamResolved = resolveFoamRow(h);
  const foamParts = [];
  if (!foamResolved) foamParts.push("Foam Part is ambiguous or incomplete — check color, thickness, and Part Color if shown.");
  return (
    (foamParts.length ? foamParts.join(" ") : "Foam row resolves. ") +
    "Export also requires Requested By or Sample Name, Wheel, Pad Size, Loop Type, and Finished Pad."
  );
}
