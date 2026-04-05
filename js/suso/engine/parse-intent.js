export function parseIntentConfigurator(text) {
  const raw = (text || "").trim();
  const t = raw.toLowerCase();
  const intent = { raw, type: "configure", action: null, direction: null, target: null, insane: false };
  if (!t) {
    intent.type = "none";
    return intent;
  }
  if (/\b(fly|divine|god|miracle)\b/.test(t)) intent.insane = true;

  if (
    (/\b(export|download)\b/.test(t) && /\b(bom|xlsx|excel|spreadsheet)\b/.test(t)) ||
    /^\s*export\s+bom\s*$/i.test(raw) ||
    /^\s*export\s*$/i.test(raw.trim())
  ) {
    intent.action = "export_bom";
  } else if (
    (/\breset\b/.test(t) && /\b(form|fields|all|everything|inputs?)\b/.test(t)) ||
    /^\s*reset\s*$/i.test(raw.trim())
  ) {
    intent.action = "reset_form";
  } else if (
    /\bwhy\b/.test(t) &&
    (/\b(invalid|wrong|error|bad|doesn'?t|not\s+work|won'?t)\b/.test(t) || /\b(wool|combination|combo)\b/.test(t))
  ) {
    intent.action = "explain_invalid";
  } else if (/\b(validate|check)\b/.test(t) && /\b(form|fields|selections?)\b/.test(t)) {
    intent.action = "validate";
  } else if (slotsLookLikeOptionQuestion(t)) {
    intent.action = "ask_options";
  } else if (/\b(compat|compatible|work with|go with)\b/.test(t)) {
    intent.action = "ask_compatibility";
  }

  if (!intent.action && /\b(set|put|use)\b/.test(t) && /\b(requested|requester)\b/.test(t)) intent.action = "fill_fields";
  else if (!intent.action) intent.action = "fill_fields";

  return intent;

  function slotsLookLikeOptionQuestion(tt) {
    return (
      (/\b(what|which|list)\b/.test(tt) && /\b(available|option|choices?)\b/.test(tt)) ||
      (/\bwhat\b/.test(tt) && /\bwheel/.test(tt) && /\b(size|sizes|available)\b/.test(tt))
    );
  }
}
