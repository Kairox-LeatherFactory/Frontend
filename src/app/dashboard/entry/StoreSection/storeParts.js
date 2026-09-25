// Store state on a garment: waiting → merged → holding_leather / holding_lining → holding_both → received → sended
const DONE_STATES = ["received", "sended"];

// Which parts of a garment are in the store — the backend's own flags when present,
// otherwise read off store_state
export function getStoreParts(piece) {
  const state = String(piece?.store_state || "").toLowerCase();
  const done = DONE_STATES.includes(state);
  const sent = piece?.sent ?? state === "sended";
  return {
    state,
    leather: piece?.leather_in ?? (done || state === "holding_leather" || state === "holding_both"),
    lining: piece?.lining_in ?? (done || state === "holding_lining" || state === "holding_both"),
    accessories: piece?.accessories_in ?? done,
    liningNeeded: piece?.needs_lining !== false,
    complete: piece?.complete ?? done,
    sent,
  };
}

// Filter tabs on the Store Hub — anything unknown falls back to "All"
export function matchesStoreTab(piece, tab) {
  const p = getStoreParts(piece);
  switch (tab) {
    case "LEATHER":
      return p.leather;
    case "LINING":
      return p.lining;
    case "ACCESSORIES":
      return p.accessories;
    case "COMPLETE":
      return p.complete && !p.sent;
    default:
      return true;
  }
}
