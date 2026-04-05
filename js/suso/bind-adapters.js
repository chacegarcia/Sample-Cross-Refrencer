/**
 * After inline script sets window.SUSO_ADAPTER_DEPS, wires adapter runner + session + trace helper.
 */
import { createConfiguratorAdapter } from "./adapters/configurator-adapter.js";
import { createSusoSessionStore } from "./session/store.js";
import { buildSusoTraceOut } from "./session/trace.js";

window.SusoSession = createSusoSessionStore();
window.runConfiguratorAdapter = createConfiguratorAdapter(window.SUSO_ADAPTER_DEPS);
window.buildSusoTraceOut = buildSusoTraceOut;
