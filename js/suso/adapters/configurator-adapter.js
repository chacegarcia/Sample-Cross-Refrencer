/**
 * Configurator adapter: routes `routed.kind` to workbook/DOM operations via injected deps.
 * Pure message assembly lives alongside side-effect calls so Phase C/D can split further.
 */
import { runDocumentQueryAdapter } from "./document-query-adapter.js";

/**
 * @param {import("./types.js").ConfiguratorAdapterDeps} deps
 * @returns {(routed: object) => import("./types.js").AdapterExecutionResult}
 */
export function createConfiguratorAdapter(deps) {
  if (!deps || typeof deps.getCurrentMode !== "function") {
    throw new Error("createConfiguratorAdapter requires ConfiguratorAdapterDeps");
  }

  return function runConfiguratorAdapter(routed) {
    const k = routed.kind;
    const p = routed.payload || {};

    if (k === "document_query") {
      return runDocumentQueryAdapter(routed, deps);
    }
    if (k === "export_bom") {
      deps.exportTestBOM();
      return { text: "Triggered BOM export (same validation as the Download button).", executed: true };
    }
    if (k === "reset_form") {
      deps.triggerResetClick();
      return { text: "Form reset.", executed: true };
    }
    if (k === "validate_form") {
      const v = deps.validateForExport();
      return {
        text: v.ok ? "Validation passed for the current mode." : "Validation: " + (v.msg || "Fix highlighted fields."),
        executed: true,
      };
    }
    if (k === "ask_options") {
      if (p.topic === "foam_wheel_sizes") {
        if (deps.getCurrentMode() !== "foam") {
          return { text: "Switch to Foam Pad to inspect wheels for foam geometry.", executed: true };
        }
        const thk = deps.getFoamThickness();
        if (!thk) {
          return { text: "Select a foam thickness first; wheel sizes depend on the THK column mapping.", executed: true };
        }
        const wheels = deps.wheelsForThickness(thk);
        return {
          text: "Wheels available for thickness " + thk + ": " + (wheels.length ? wheels.join(", ") : "(none in sheet for this bucket)"),
          executed: true,
        };
      }
      return { text: "Ask a more specific options question (e.g. wheel sizes for this foam).", executed: false };
    }
    if (k === "ask_compatibility") {
      return {
        text: "Compatibility is enforced by the cascading dropdowns and stack resolution. " + deps.explainConfiguratorInvalid(),
        executed: true,
      };
    }
    if (k === "explain_invalid_state") {
      const v = deps.validateForExport();
      return {
        text: deps.explainConfiguratorInvalid() + (v.ok ? "" : " Validation message: " + v.msg),
        executed: true,
      };
    }
    if (k === "set_fields") {
      const f = Object.assign({}, p.fields);
      delete f._thicknessNum;
      delete f._padNum;
      const res = deps.applyConfiguratorFields(f);
      let msg = "Applied field updates where options matched. ";
      if (p.inferenceNotes && p.inferenceNotes.length) msg += p.inferenceNotes.join(" ");
      if (p.clarifications && p.clarifications.length) msg += " Note: " + p.clarifications.join(" ");
      if (res.skipped && Object.keys(res.skipped).length) msg += " Skipped (no matching option): " + JSON.stringify(res.skipped);
      return { text: msg.trim(), executed: true, applied: res.applied };
    }

    return { text: "Unhandled routed kind: " + k, executed: false };
  };
}
