/** Workbook column keys for LCM foam/geo sheets (product-specific). */
export const COL = {
  foam_color: "Color",
  foam_part: "Part",
  foam_partColor: "Part Color",
  foam_thickness: "Thickness",
  foam_firmness: "Firmness",
  geo_wheel: "Wheel",
  geo_padSizes: "Pad Sizes",
  geo_grindDia: "Grinded Loop Dia",
};

/**
 * Canonical wool sheet headers (row object keys after parse). Aliases live in `sheet-parse.js`.
 * Real workbooks may use different labels; the parser maps them to these strings.
 */
export const WOOL_COL = {
  partNum: "Part Num",
  finalOd: "Final OD",
  napLength: "Nap Length",
  opTuftedPadDia: "Op Tufted Pad Dia",
  yarn: "Yarn",
  substrateType: "Substrate Type",
  substrateSize: "Substrate Size",
  substratePart: "Substrate Part",
};

/** Canonical stack sheet headers (row keys after parse). */
export const STACK_COL = {
  polySizeMil: "Poly Size MIL",
  polyType: "Poly Type",
  polyDia: "Poly Dia",
  backingSize: "Backing Size",
  loop: "Loop",
  canvas: "Canvas",
  polyPart: "Poly Part",
};
