import { COL } from "../columns.js";
import { norm, normU, toNum } from "../form-state.js";

export function foamRowsByColor(foamRows, color) {
  const c = normU(color);
  return foamRows.filter((r) => normU(r[COL.foam_color]) === c);
}

export function foamRowsByColorThickness(foamRows, color, thickness) {
  const c = normU(color);
  const t = toNum(thickness);
  if (!c || t === null) return [];
  return foamRows.filter((r) => {
    if (normU(r[COL.foam_color]) !== c) return false;
    const rt = toNum(r[COL.foam_thickness]);
    return rt !== null && Math.abs(rt - t) < 1e-9;
  });
}

export function geoRowsByWheel(geoRows, wheel) {
  const w = normU(wheel);
  return geoRows.filter((r) => normU(r[COL.geo_wheel]) === w);
}
