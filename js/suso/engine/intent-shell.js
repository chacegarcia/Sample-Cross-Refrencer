import { susoListRejectedAdaptersConfigurator } from "./domain.js";

export function susoInitIntentShell(intent, trace) {
  if (!intent._suso) intent._suso = { locks: Object.create(null), trace: trace || [], domain: null };
  intent._suso.trace = trace || intent._suso.trace || [];
  return intent;
}

export function susoNormalizeConfiguratorRequest(adapter, kind, domain, rule, payload) {
  return {
    version: 1,
    kind,
    adapter,
    domain,
    rule,
    payload,
    rejectedAlternatives: susoListRejectedAdaptersConfigurator(adapter),
  };
}
