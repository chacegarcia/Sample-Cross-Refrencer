/**
 * Binds LCM product modules to globals expected by index.html (window.LCM_HOST must be set first).
 */
import { COL } from "./columns.js";
import { lcmWorkbookToDb } from "./sheet-parse.js";
import * as FS from "./form-state.js";
import { foamRowsByColor as fbc, foamRowsByColorThickness as fbct, geoRowsByWheel as grbw } from "./catalog/foam-catalog.js";
import { buildThkMaps as buildThkMapsImpl, wheelsForThickness as wft, thicknessesForWheel as tft } from "./catalog/geo-thk.js";
import { createInferFieldsFromText } from "./infer-fields.js";
import * as FoamWool from "./foam-wool-ui.js";
import * as Apply from "./apply-config.js";
import * as Val from "./validate-export.js";
import * as Wiz from "./wizard-steps.js";
import * as Progress from "./progress.js";

window.COL = COL;
window.lcmWorkbookToDb = lcmWorkbookToDb;
Object.assign(window, {
  norm: FS.norm,
  normU: FS.normU,
  toNum: FS.toNum,
  uniqSorted: FS.uniqSorted,
  splitMaybeComma: FS.splitMaybeComma,
  uniq: FS.uniq,
  susoNormalizeNumericText: FS.susoNormalizeNumericText,
  susoSanitizeForBoldEcho: FS.susoSanitizeForBoldEcho,
  isTruthy: FS.isTruthy,
  pickMatchingOption: FS.pickMatchingOption,
});

function H() {
  return window.LCM_HOST;
}

function host() {
  const x = H();
  return {
    els: x.els,
    foamRows: x.foamRows,
    geoRows: x.geoRows,
    woolRows: x.woolRows,
    stackRows: x.stackRows,
    wb: x.wb,
    currentMode: x.currentMode,
    setSelectOptions: x.setSelectOptions,
    showDebug: x.showDebug,
    setCurrentMode: x.setCurrentMode,
    clearMissing: x.clearMissing,
    markMissing: x.markMissing,
    setStatus: x.setStatus,
    hasAnyName: () => Val.hasAnyName({ els: x.els }),
  };
}

export function wireLcm() {
  window.buildThkMaps = () => buildThkMapsImpl(H().geoRows);
  window.wheelsForThickness = (thk) => wft(H().geoRows, thk);
  window.thicknessesForWheel = (wheel) => tft(H().geoRows, wheel);
  window.foamRowsByColor = (color) => fbc(H().foamRows, color);
  window.foamRowsByColorThickness = (color, thickness) => fbct(H().foamRows, color, thickness);
  window.geoRowsByWheel = (wheel) => grbw(H().geoRows, wheel);

  window.susoInferFieldsFromText = createInferFieldsFromText({
    getFoamRows: () => H().foamRows,
    getGeoRows: () => H().geoRows,
    getWoolRows: () => H().woolRows,
    getCurrentMode: () => H().currentMode,
    getEls: () => H().els,
    thicknessesForWheel: tft,
  });

  window.recomputeFoam = () => FoamWool.recomputeFoam(host());
  window.resolveFoamRow = () => FoamWool.resolveFoamRow(host());
  window.populateWoolPadSizes = () => FoamWool.populateWoolPadSizes(host());
  window.recomputeWoolNap = () => FoamWool.recomputeWoolNap(host());
  window.recomputeWoolYarn = () => FoamWool.recomputeWoolYarn(host());
  window.resolveWoolDia = () => FoamWool.resolveWoolDia(host());
  window.resolveWoolBase = () => FoamWool.resolveWoolBase(host());
  window.stackCandidatesForBase = () => FoamWool.stackCandidatesForBase(host());
  window.resolveWoolStackFinal = () => FoamWool.resolveWoolStackFinal(host());
  window.isWoolComplete = () => FoamWool.isWoolComplete(host());
  window.recomputeWoolStack = () => FoamWool.recomputeWoolStack(host());
  window.recomputeWoolAll = () => FoamWool.recomputeWoolAll(host());
  window.updateDebugAndButtons = () => FoamWool.updateDebugAndButtons(host());
  window.updateMode = () => FoamWool.updateMode(host());
  window.susoTryApplyUniqueFoamThicknessFromWheel = () => FoamWool.susoTryApplyUniqueFoamThicknessFromWheel(host());

  window.applyProdType = (pt) => Apply.applyProdType(host(), pt);
  window.applyConfiguratorFields = (partial) => Apply.applyConfiguratorFields(host(), partial);
  window.explainConfiguratorInvalid = () => Apply.explainConfiguratorInvalid(host());

  window.hasAnyName = () => Val.hasAnyName({ els: H().els });
  window.validateForExport = () => Val.validateForExport(host());

  window.getNextMissingSlot = () => Wiz.getNextMissingSlot(host());
  window.tryApplyStepAnswer = (text, step) => Wiz.tryApplyStepAnswer(host(), text, step);
  window.tryParseIdentityLine = (text) => Wiz.tryParseIdentityLine(host(), text);
  window.susoStepShortLabel = Wiz.susoStepShortLabel;
  window.susoApplyStepValue = (stepId, value) => Wiz.susoApplyStepValue(host(), stepId, value);
  window.susoStepAllowsAutoSingle = Wiz.susoStepAllowsAutoSingle;
  window.susoAutoFillSingleOptionSteps = () =>
    Wiz.susoAutoFillSingleOptionSteps(host(), () => Wiz.getNextMissingSlot(host()));

  window.susoBuildProgressLine = () => Progress.susoBuildProgressLine(host());

  window.SUSO_DEPS = {
    inferFieldsFromText: window.susoInferFieldsFromText,
    getCurrentMode: () => H().currentMode,
  };
}

wireLcm();
