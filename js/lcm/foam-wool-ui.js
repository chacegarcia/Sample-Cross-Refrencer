import { COL } from "./columns.js";
import { foamRowsByColor, foamRowsByColorThickness, geoRowsByWheel } from "./catalog/foam-catalog.js";
import { wheelsForThickness, thicknessesForWheel } from "./catalog/geo-thk.js";
import { norm, normU, toNum, uniqSorted, splitMaybeComma, isTruthy } from "./form-state.js";

/**
 * @param {object} h LCM host: els, foamRows, geoRows, woolRows, stackRows, wb, currentMode, setSelectOptions, showDebug
 */
export function resolveFoamRow(h) {
  const color = h.els.foamColor.value;
  const thk = h.els.foamThickness.value;
  if (!color || !thk) return null;

  const matches = foamRowsByColorThickness(h.foamRows, color, thk);
  if (matches.length === 1) return matches[0];

  const pc = h.els.foamPartColor.value;
  if (!pc) return null;

  return matches.find((r) => normU(r[COL.foam_partColor]) === normU(pc)) || null;
}

export function recomputeFoam(h) {
  const color = h.els.foamColor.value;

  const thicknessOpts = color ? uniqSorted(foamRowsByColor(h.foamRows, color), COL.foam_thickness) : [];
  h.setSelectOptions(h.els.foamThickness, thicknessOpts, "— Select Thickness —", true);

  const thk = h.els.foamThickness.value;
  const matches = color && thk ? foamRowsByColorThickness(h.foamRows, color, thk) : [];

  if (matches.length > 1) {
    h.els.foamPartColorRow.classList.remove("hidden");
    const pcs = Array.from(
      new Set(matches.map((r) => norm(r[COL.foam_partColor])).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    h.setSelectOptions(h.els.foamPartColor, pcs, "— Select Part Color —", true);
  } else {
    h.els.foamPartColorRow.classList.add("hidden");
    h.els.foamPartColor.innerHTML = '<option value="">—</option>';
    h.els.foamPartColor.value = "";
  }

  const wheelOpts = thk ? wheelsForThickness(h.geoRows, thk) : uniqSorted(h.geoRows, COL.geo_wheel);
  const prevWheel = h.els.foamWheel.value;
  h.setSelectOptions(h.els.foamWheel, wheelOpts, "— Select Wheel —", true);
  if (prevWheel && !wheelOpts.some((w) => normU(w) === normU(prevWheel))) {
    h.els.foamWheel.value = "";
  }

  const padOpts = uniqSorted(geoRowsByWheel(h.geoRows, h.els.foamWheel.value), COL.geo_padSizes).flatMap(splitMaybeComma);
  const padUnique = Array.from(new Set(padOpts)).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
  h.setSelectOptions(h.els.foamPadSize, padUnique, "— Select Pad Size —", true);

  updateDebugAndButtons(h);
}

export function updateDebugAndButtons(h) {
  const foamResolved = resolveFoamRow(h);
  const wheel = h.els.foamWheel.value;
  const pad = h.els.foamPadSize.value;

  let grindDia = null;
  if (wheel && pad) {
    const row = h.geoRows.find(
      (r) =>
        normU(r[COL.geo_wheel]) === normU(wheel) &&
        splitMaybeComma(r[COL.geo_padSizes]).some((p) => normU(p) === normU(pad))
    );
    grindDia = row ? norm(row[COL.geo_grindDia]) : null;
  }

  const out = {
    sheetCounts: {
      foamRows: h.foamRows.length,
      geoRows: h.geoRows.length,
      woolRows: h.woolRows.length,
      stackRows: h.stackRows.length,
    },
    selections: {
      productType: h.currentMode,
      requestedBy: h.els.reqName.value,
      sampleName: h.els.sampleName.value,
    },
    resolvedFoam: foamResolved
      ? {
          part: norm(foamResolved[COL.foam_part]),
          partColor: norm(foamResolved[COL.foam_partColor]),
          firmness: norm(foamResolved[COL.foam_firmness]),
        }
      : null,
    resolvedGeo: grindDia ? { grindedLoopDia: grindDia } : null,
  };
  h.showDebug(out);

  h.els.btnDownload.disabled = !h.wb;
}

export function populateWoolPadSizes(h) {
  h.setSelectOptions(h.els.woolPadSize, uniqSorted(h.woolRows, "Final OD"), "— Select Pad Size —", false);
  h.setSelectOptions(h.els.woolNap, [], "— Select Nap —", false);
  h.setSelectOptions(h.els.woolYarn, [], "— Select Yarn —", false);
  h.setSelectOptions(h.els.woolBacking, [], "— Select Backing —", false);
  h.setSelectOptions(h.els.woolPoly, [], "— Select Poly —", false);
  h.setSelectOptions(h.els.woolMil, [], "— Select MIL —", false);
}

export function recomputeWoolNap(h) {
  const od = h.els.woolPadSize.value;
  const naps = od ? uniqSorted(h.woolRows.filter((r) => normU(r["Final OD"]) === normU(od)), "Nap Length") : [];
  h.setSelectOptions(h.els.woolNap, naps, "— Select Nap —", true);
}

export function recomputeWoolYarn(h) {
  const od = h.els.woolPadSize.value;
  const nap = h.els.woolNap.value;
  const rows = h.woolRows.filter(
    (r) =>
      (!od || normU(r["Final OD"]) === normU(od)) && (!nap || normU(r["Nap Length"]) === normU(nap))
  );
  const yarns = uniqSorted(rows, "Yarn");
  h.setSelectOptions(h.els.woolYarn, yarns, "— Select Yarn —", true);
}

export function resolveWoolDia(h) {
  const od = h.els.woolPadSize.value;
  const nap = h.els.woolNap.value;
  if (!od || !nap) return null;
  const rows = h.woolRows.filter(
    (r) => normU(r["Final OD"]) === normU(od) && normU(r["Nap Length"]) === normU(nap)
  );
  if (!rows.length) return null;
  const dias = Array.from(new Set(rows.map((r) => norm(r["Op Tufted Pad Dia"])).filter(Boolean)));
  if (dias.length === 1) return dias[0];
  const yarn = h.els.woolYarn.value;
  if (yarn) {
    const rr = rows.find((x) => normU(x["Yarn"]) === normU(yarn));
    return rr ? norm(rr["Op Tufted Pad Dia"]) : null;
  }
  return null;
}

export function resolveWoolBase(h) {
  const od = h.els.woolPadSize.value;
  const nap = h.els.woolNap.value;
  const yarn = h.els.woolYarn.value;
  if (!od || !nap || !yarn) return null;
  return (
    h.woolRows.find(
      (r) =>
        normU(r["Final OD"]) === normU(od) &&
        normU(r["Nap Length"]) === normU(nap) &&
        normU(r["Yarn"]) === normU(yarn)
    ) || null
  );
}

export function stackCandidatesForBase(h) {
  const dia = resolveWoolDia(h);
  if (!dia) return [];
  return h.stackRows.filter((r) => norm(r["Poly Dia"]) === dia);
}

export function resolveWoolStackFinal(h) {
  const candidates = stackCandidatesForBase(h);
  let cand = candidates.slice();

  if (h.els.woolBacking.value === "Loop") cand = cand.filter((r) => isTruthy(r["Loop"]));
  if (h.els.woolBacking.value === "Canvas") cand = cand.filter((r) => isTruthy(r["Canvas"]));

  if (h.els.woolPoly.value) cand = cand.filter((r) => normU(r["Poly Type"]) === normU(h.els.woolPoly.value));
  if (h.els.woolMil.value) cand = cand.filter((r) => normU(r["Poly Size MIL"]) === normU(h.els.woolMil.value));

  return cand.length === 1 ? cand[0] : null;
}

export function isWoolComplete(h) {
  const base = resolveWoolBase(h);
  const stack = resolveWoolStackFinal(h);
  return !!(
    h.wb &&
    base &&
    stack &&
    h.els.woolBacking.value &&
    h.els.woolPoly.value &&
    h.els.woolMil.value
  );
}

export function recomputeWoolStack(h) {
  const candidates = stackCandidatesForBase(h);

  const backs = [];
  if (candidates.some((r) => isTruthy(r["Loop"]))) backs.push("Loop");
  if (candidates.some((r) => isTruthy(r["Canvas"]))) backs.push("Canvas");
  h.setSelectOptions(h.els.woolBacking, backs, "— Select Backing —", true);

  let cand2 = candidates.slice();
  if (h.els.woolBacking.value === "Loop") cand2 = cand2.filter((r) => isTruthy(r["Loop"]));
  if (h.els.woolBacking.value === "Canvas") cand2 = cand2.filter((r) => isTruthy(r["Canvas"]));

  const polys = uniqSorted(cand2, "Poly Type");
  h.setSelectOptions(h.els.woolPoly, polys, "— Select Poly —", true);

  let cand3 = cand2.slice();
  if (h.els.woolPoly.value) cand3 = cand3.filter((r) => normU(r["Poly Type"]) === normU(h.els.woolPoly.value));

  const mils = uniqSorted(cand3, "Poly Size MIL");
  h.setSelectOptions(h.els.woolMil, mils, "— Select MIL —", true);
}

export function recomputeWoolAll(h) {
  recomputeWoolNap(h);
  recomputeWoolYarn(h);
  recomputeWoolStack(h);
  updateDebugAndButtons(h);
}

export function updateMode(h) {
  const el = document.querySelector('input[name="prodType"]:checked');
  const type = el ? el.value : null;
  h.setCurrentMode(type);
  if (type === "foam") {
    document.getElementById("foamCard").style.display = "";
    document.getElementById("woolCard").style.display = "none";
  } else if (type === "wool") {
    document.getElementById("foamCard").style.display = "none";
    document.getElementById("woolCard").style.display = "";
  } else {
    document.getElementById("foamCard").style.display = "none";
    document.getElementById("woolCard").style.display = "none";
  }
  updateDebugAndButtons(h);
}

export function susoTryApplyUniqueFoamThicknessFromWheel(h) {
  if (h.currentMode !== "foam" || !h.foamRows.length || !h.geoRows.length) return null;
  if (h.els.foamThickness && h.els.foamThickness.value) return null;
  const color = h.els.foamColor ? h.els.foamColor.value : "";
  const wheel = h.els.foamWheel ? h.els.foamWheel.value : "";
  if (!color || !wheel) return null;
  const nums = thicknessesForWheel(h.geoRows, wheel);
  if (!nums.length) return null;
  const foamOpts = uniqSorted(foamRowsByColor(h.foamRows, color), COL.foam_thickness);
  const candidates = foamOpts.filter((t) => {
    const n = toNum(t);
    return n !== null && nums.some((bw) => Math.abs(bw - n) < 1e-9);
  });
  if (candidates.length !== 1) return null;
  h.els.foamThickness.value = candidates[0];
  recomputeFoam(h);
  return candidates[0];
}
