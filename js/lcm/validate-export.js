import { norm } from "./form-state.js";
import { resolveFoamRow, resolveWoolStackFinal } from "./foam-wool-ui.js";

export function hasAnyName(h) {
  return !!(norm(h.els.reqName.value) || norm(h.els.sampleName.value));
}

export function validateForExport(h) {
  h.clearMissing();

  if (!h.wb) {
    h.setStatus("Load data first.", false);
    return { ok: false, msg: "Load data first." };
  }

  if (!h.currentMode) {
    return { ok: false, msg: "Choose foam pad or tufted wool first." };
  }

  if (!hasAnyName(h)) {
    h.markMissing(h.els.reqName);
    h.markMissing(h.els.sampleName);
    return { ok: false, msg: "Fill Requested By or Sample Name." };
  }

  if (h.currentMode === "foam") {
    if (!h.els.foamColor.value) h.markMissing(h.els.foamColor);
    if (!h.els.foamThickness.value) h.markMissing(h.els.foamThickness);

    const foamNeedsPartColor = !h.els.foamPartColorRow.classList.contains("hidden");
    if (foamNeedsPartColor && !h.els.foamPartColor.value) h.markMissing(h.els.foamPartColor);

    if (!h.els.foamWheel.value) h.markMissing(h.els.foamWheel);
    if (!h.els.foamPadSize.value) h.markMissing(h.els.foamPadSize);

    const qty = parseInt(h.els.foamQty.value || "0", 10);
    if (!Number.isFinite(qty) || qty < 1) h.markMissing(h.els.foamQty);

    if (!h.els.foamLoopType.value) h.markMissing(h.els.foamLoopType);
    if (!h.els.foamHole.value) h.markMissing(h.els.foamHole);

    resolveFoamRow(h);

    const anyMissing = document.querySelector(".row.missing");
    return { ok: !anyMissing, msg: anyMissing ? "Fill the highlighted foam fields." : "" };
  }

  if (!h.els.woolPadSize.value) h.markMissing(h.els.woolPadSize);
  if (!h.els.woolNap.value) h.markMissing(h.els.woolNap);
  if (!h.els.woolYarn.value) h.markMissing(h.els.woolYarn);
  if (!h.els.woolBacking.value) h.markMissing(h.els.woolBacking);
  if (!h.els.woolPoly.value) h.markMissing(h.els.woolPoly);
  if (!h.els.woolMil.value) h.markMissing(h.els.woolMil);

  if (!resolveWoolStackFinal(h)) {
    h.markMissing(h.els.woolBacking);
    h.markMissing(h.els.woolPoly);
    h.markMissing(h.els.woolMil);
  }

  const anyMissing = document.querySelector(".row.missing");
  return { ok: !anyMissing, msg: anyMissing ? "Fill the highlighted wool fields." : "" };
}
