/**
 * @typedef {object} AdapterExecutionResult
 * @property {string} text
 * @property {boolean} executed
 * @property {boolean} [stub]
 * @property {object} [applied]
 */

/**
 * Injected LCM shell dependencies for configurator adapter (DOM / workbook side effects).
 * @typedef {object} ConfiguratorAdapterDeps
 * @property {() => string|null} getCurrentMode
 * @property {() => void} exportTestBOM
 * @property {() => void} triggerResetClick
 * @property {() => { ok: boolean, msg?: string }} validateForExport
 * @property {() => string} explainConfiguratorInvalid
 * @property {(partial: object) => { applied: object, skipped: object }} applyConfiguratorFields
 * @property {(thicknessVal: string) => string[]} wheelsForThickness
 * @property {() => string} getFoamThickness
 * @property {() => import("../llm/contract.js").SusoLlmAdapter|null|undefined} [getLlmAdapter]
 */

export {};
