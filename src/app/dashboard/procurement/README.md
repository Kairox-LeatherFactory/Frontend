# KairoX Procurement — API Reference Mock Implementation

This folder is a frontend-only implementation of the existing Procurement mock, updated to follow the supplied **KAIROX Procurement API Reference** and **Phase-2 System & Business Guide**.

## Included
- `procurement/intake/page.js` — Stage 1 submission workspace, document validation UI, heuristic → LLM fallback, manual-review force accept, readiness gate, async order breakdown polling, style/spec confirmation and BOM generation.
- `procurement/bom/[id]/page.js` — Stage 2/3 BOM editor, server-style recomputation, optimistic `base_revision`, cutting confirmation, MD approve/reject/reopen and export.
- `procurement/inventory/page.js` — Stage 4 inventory check, sufficient/partial/out-of-stock lines, advisory fuzzy suggestions, excluded manufacturing/FOB lines, re-run and PO generation.
- `procurement/po/page.js` — Stage 5 supplier PO flow, ambiguous supplier selection, submit → approve → send → manual acknowledgement.
- `procurement/production/page.js` — nine-rung production board and human release to production.
- `procurement/page.js` — Procurement control center.
- `lib/api.js` — browser-only mock API with API-reference-shaped responses, errors, async polling simulation and `localStorage` persistence.

## Important
This does **not** call a real backend. It is deliberately a mock API layer so the UI can be demonstrated before the backend endpoints are implemented.

The mock API uses the reference fixture IDs and numbers where those are defined in the API Reference. It also models the important state gates and error families: `needs_manual_review`, `stale_revision`, `bom_locked`, `cutting_confirmation_required`, `no_inventory_check`, `needs_supplier`, and `po_locked`.

## Integration
Copy the included `procurement` folder into the existing Next.js app and copy `lib/api.js` to the app's `lib/api.js` (or merge the exported functions into the existing API module). The existing project-level `@/components/SpotlightCard` and `@/context/AuthContext` are intentionally reused rather than duplicated.

For a clean demo state in the browser console:

```js
localStorage.removeItem('kairox_procurement_mock_v2')
```

Then open Procurement → Intake.

Suggested demo filenames:
- `ORDER BOGGI SS27.xlsx` — heuristic acceptance as order sheet.
- `SPEC CLERMONT.pdf` — heuristic acceptance as spec sheet.
- `packing-list.xlsx` — LLM-style rejection diagnostic for an order-sheet slot.
- an unrelated supported filename — LLM/inconclusive → manual review flow.
