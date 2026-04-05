export function susoBuildConfiguratorSemanticSlots(low, matches) {
  const mlow = String(low || "");
  const slots = {
    questionType: null,
    intentTag: null,
    productType: null,
    loopType: null,
    finishedPad: null,
    orientation: null,
    printType: null,
    attributes: [],
    document: null,
    domainCue: [],
  };
  if (/\b(what|which|how much|how many|list)\b/.test(mlow)) slots.questionType = "wh_question";
  else if (/\bwhy\b/.test(mlow)) slots.questionType = "why_question";
  if (/\b(show|find|tell|give|lookup|display|available)\b/.test(mlow)) slots.intentTag = "retrieve";

  for (const m of matches) {
    if (m.category === "product_type" && m.canonical) slots.productType = m.canonical;
    if (m.category === "loop_type" && m.canonical) slots.loopType = m.canonical;
    if (m.category === "finished_pad" && m.canonical) slots.finishedPad = m.canonical;
    if (m.category === "orientation" && m.canonical) slots.orientation = m.canonical;
    if (m.category === "print_type" && m.canonical) slots.printType = m.canonical;
    if (m.category === "attribute" && m.canonical) {
      slots.attributes.push(m.canonical);
      slots.domainCue.push("attribute:" + m.canonical);
    }
    if (m.category === "document" && m.canonical) {
      slots.document = m.canonical;
      slots.domainCue.push("document:" + m.canonical);
    }
    if (m.category === "intent" && m.canonical === "export_bom") slots.intentTag = "export_bom";
  }
  return slots;
}
