import { norm, susoSanitizeForBoldEcho } from "./form-state.js";

export function susoBuildProgressLine(h) {
  if (!h.wb) return "";
  const parts = [];
  if (h.currentMode === null) {
    return "**Progress:** Pick **foam** or **tufted wool**.";
  }
  if (h.currentMode === "foam") parts.push("Foam");
  else parts.push("Tufted wool");
  if (h.hasAnyName()) {
    const who = norm(h.els.reqName.value);
    const sn = norm(h.els.sampleName.value);
    const idBits = [];
    if (who) idBits.push("req **" + susoSanitizeForBoldEcho(who.length > 24 ? who.slice(0, 21) + "…" : who) + "**");
    if (sn) idBits.push("sample **" + susoSanitizeForBoldEcho(sn.length > 20 ? sn.slice(0, 17) + "…" : sn) + "**");
    if (idBits.length) parts.push(idBits.join(", "));
  } else {
    parts.push("identity pending");
  }
  if (h.currentMode === "foam") {
    if (h.els.foamColor.value) parts.push("color **" + susoSanitizeForBoldEcho(h.els.foamColor.value) + "**");
    if (h.els.foamThickness.value) parts.push("thick **" + h.els.foamThickness.value + "**");
    if (h.els.foamPartColor && h.els.foamPartColor.value && !h.els.foamPartColorRow.classList.contains("hidden"))
      parts.push("part **" + susoSanitizeForBoldEcho(h.els.foamPartColor.value) + "**");
    if (h.els.foamWheel.value) parts.push("wheel **" + susoSanitizeForBoldEcho(h.els.foamWheel.value) + "**");
    if (h.els.foamPadSize.value) parts.push("pad **" + h.els.foamPadSize.value + "**");
    const q = parseInt(h.els.foamQty.value || "0", 10);
    if (Number.isFinite(q) && q >= 1) parts.push("qty **" + q + "**");
    if (h.els.foamLoopType.value) parts.push(h.els.foamLoopType.value);
    if (h.els.foamHole.value) parts.push(h.els.foamHole.value);
  } else if (h.currentMode === "wool") {
    if (h.els.woolPadSize.value) parts.push("OD **" + h.els.woolPadSize.value + "**");
    if (h.els.woolNap.value) parts.push("nap **" + h.els.woolNap.value + "**");
    if (h.els.woolYarn.value) parts.push("yarn **" + susoSanitizeForBoldEcho(h.els.woolYarn.value) + "**");
    if (h.els.woolOrientation.value) parts.push(h.els.woolOrientation.value);
    if (h.els.woolBacking.value) parts.push("back **" + susoSanitizeForBoldEcho(h.els.woolBacking.value) + "**");
    if (h.els.woolPoly.value) parts.push("poly **" + susoSanitizeForBoldEcho(h.els.woolPoly.value) + "**");
    if (h.els.woolMil.value) parts.push("MIL **" + h.els.woolMil.value + "**");
    if (h.els.woolPrint.value) parts.push("print **" + susoSanitizeForBoldEcho(h.els.woolPrint.value) + "**");
  }
  return "**Progress:** " + parts.join(" · ");
}
