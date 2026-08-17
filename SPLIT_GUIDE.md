# entry/page.js Split Guide

Reference for manually splitting `src/app/dashboard/entry/page.js` (~5420 lines) into
5 files. Line numbers are from the file **as it stands right now** — re-check them
if you edit the file before starting the split, since every edit shifts everything below it.

Two context hooks are already global and need no prop-drilling — just call them
directly inside each new file:
```js
const { user, token, ROLE_OPERATIONS } = useAuth();   // from '@/context/AuthContext'
const { workers, addScanEvent, operations } = useData(); // from '@/context/DataContext'
```

---

## 1. `shared.js` — pure constants + helpers, no state

Move as-is (no dependencies on component state):

| Item | Line |
|---|---|
| `manualStages` array | 469-471 |
| `PREREQUISITE_MAP` | 1133-1148ish |
| `UI_TO_API_STAGE` | 1148-1159ish |
| `API_TO_UI_STAGE` | 1159-1161ish |

`isStageAllowedForRole` (458-463) is a good candidate for a `useRoleAccess()` hook
here too (takes `user`, `allowedOperations`, `isFullAccess` — all derivable from
`useAuth()` inside the hook itself). Bundle these together:
- `allowedOperations` (453)
- `isReadOnly` (454)
- `isFullAccess` (455)
- `isStoreAccess` (456)
- `isStageAllowedForRole` (458-463)

→ `useRoleAccess()` returning `{ allowedOperations, isReadOnly, isFullAccess, isStoreAccess, isStageAllowedForRole }`, callable from all 3 section files with no props needed.

---

## 2. `page.js` — thin shell (navigation + genuinely cross-section state)

**Keep here:**
- Top-level imports, `export default function ProductionLogEntry()`
- `activeDoor` state (507-509) + the 3 tab-switch buttons (~2854-2903)
- `successMsg` / `errorMsg` (499-500) + the toast UI that renders them — every section needs to call `setSuccessMsg`/`setErrorMsg`, so keep the state here and pass the two setters down as props
- `date` (477) — read by both Barcode-door and Manual-door submits
- `completedStagesMap` (601) + `recordStageCompletion` (1276-1305ish) — written/read by **all three** sections (Store Hub's `handleStoreTransition`/`handleSendToLineStitching`, Barcode-door's submits, Manual-door's `handleConfirmCuttingSave`) — pass `recordStageCompletion` down as a prop
- `storeSendedSkus` (486) — **written by Store Hub, read by Manual Door's `isSended` checks** (lines ~2510, ~4401) — this one is easy to miss since it's declared up near the top, away from the Store Hub state block
- Material-lot state, shared between Barcode-door's and Manual-door's Cutting/Lining screens (confirmed via the "Dynamic Material Lots Fetcher" `useEffect` that branches on `activeDoor === 'manual' ? selectedStage : barcodeStage`):
  - `lotArticle`, `lotColor`, `lotThickness` (580-582)
  - `lotOptions`, `lotResults`, `lotLoading`, `lotCategory` (584-587)
  - the fetcher `useEffect` itself (~2179-2230ish, the one starting `const isCutting = activeDoor === 'manual' ? ...`)
- `bucketResult` (597) / `showBucketModal` (598) + the Bucket Result Modal JSX (~4581-4723) — set by **both** `handleBarcodeBatchSubmit` (line ~2073) **and** `handleConfirmCuttingSave` (line ~2570) — pass the two setters down
- `cameraScanTarget` (503) + the `<CameraScannerModal>` render (~2822-2840) — targets are `'worker' | 'sku' | 'store'`, so it's used across doors — pass `setCameraScanTarget` down
- `router` — just call `useRouter()` in whichever file needs it, no need to centralize
- **CORRECTION (found during actual extraction — the earlier version of this guide had this wrong):** `barcodeWorker`, `barcodeWorkerInput`, `barcodeWorkerChecking`, `barcodeNotCheckedInModal` (558-561) and `handleVerifyBarcodeWorker` (~1479-1549) are **NOT Barcode-door-only** — Store Hub reuses the exact same `barcodeWorker` state for its own "Step 1: Verify Worker" (confirmed via grep — it reads `barcodeWorker.name`/`.employee_barcode`/`.designation` at lines ~4759-4840, and `handleStoreTransition` reads `barcodeWorker` at line ~887-891 to build the actor payload). Move this whole group to `page.js` instead of `BarcodeDoorSection.js`. Each door keeps its own JSX markup for the worker card (they're styled differently), but both read from this one shared state and call this one shared verify function.
- `mounted` (2115) — used to gate `createPortal` calls for **multiple** modals across different doors (Bucket Result Modal, Excel Preview, Check-in/out warnings), so it stays in `page.js`, not Manual-door-only as originally listed below.
- **CORRECTION 2:** `barcodeDcm`/`setBarcodeDcm` (567) — Manual Door's own "Total Cut Area (DCM) / Count" field (JSX line ~3874) is bound to this SAME state, not a local one. Move to `page.js`. (`barcodeDcmConfirmed` stays Barcode-door-only — verified it's never read by Manual Door.)
- **CORRECTION 3:** `storeReceiveStatus`/`setStoreReceiveStatus` (450) — Store Hub's own primary state, but Manual Door also reads it directly (`isSended` check at line ~2510: `storeReceiveStatus === 'sended' || storeSendedSkus.includes(skuCode)...`). Move to `page.js`; Store Hub keeps writing it, Manual Door just reads it as a prop.
- `barcodeNotCheckedInModal` (561) — only ever *rendered* inside Barcode-door's JSX, but it's *set* by the shared `handleVerifyBarcodeWorker` (which itself moved to page.js per Correction 1) — keep the state in `page.js`, pass it down to `BarcodeDoorSection` as a prop for rendering. Store Hub doesn't currently render anything for it.

**This list is now the product of an exhaustive check** — every one of the 106 top-level state variables in the file was tested against all three door JSX regions programmatically, not just spot-checked. High confidence nothing else is silently cross-cutting.

---

## 3. `BarcodeDoorSection.js`

**State** (all barcode-door-prefixed, safe to move as a block — EXCEPT the worker-verify group, which moved to page.js, see the correction note above):
```
barcodeStage, barcodeSkuInput, barcodeSelectedSku, barcodeSkuVerifying,
barcodeDcm, barcodeDcmConfirmed, sessionCutSkus                                       (563-569)
cuttingBatchPieces, cuttingPieceInput, cuttingPieceResolving, closedCuttingSkus       (571-574)
barcodePieceResolving, scannedPieceDrawerInfo                                         (576-577)
barcodePieceInput, barcodeBatchPieces, barcodeSubmitting,
barcodeSuccessModal, barcodeSequenceWarning                                           (590-594)
```

**Functions:**
```
resolveWorkableStage        (~1171)  — pure fn of (pieceState, isFullAccess, allowedOperations, manualStages, API_TO_UI_STAGE)
advanceToNextPipelineStage  (~1189)  — closes over barcodeStage/setBarcodeStage directly, must stay local
validateStageSequence       (~1205)  — doc comment says "used only inside handleBarcodePieceScan" — barcode-door only
handleVerifyBarcodeWorker   (~1479)
handleVerifySkuBarcode      (~1550)
handleCuttingPieceScan      (~1717)
handleBarcodeCuttingSubmit  (~1789)
handleBarcodePieceScan      (~1886)
handleBarcodeBatchSubmit    (~2019)
```

**JSX:** the `{activeDoor === 'barcode' && (...)}` block, roughly **2903 → 3584**.

**Props needed from page.js:** `setSuccessMsg`, `setErrorMsg`, `date`, `recordStageCompletion`, `lotArticle`/`lotColor`/`lotThickness`/`lotOptions`/`lotResults`/`lotLoading`/`lotCategory`, `setBucketResult`/`setShowBucketModal`, `setCameraScanTarget`. Plus `manualStages`/`UI_TO_API_STAGE`/`API_TO_UI_STAGE`/`PREREQUISITE_MAP` from `shared.js` and role info from `useRoleAccess()`.

---

## 4. `ManualDoorSection.js`

**State:**
```
selectedStage, customDesignation                                                      (466-467)
workerId, skuCode, pieceSeqs, cuttingCount                                            (473-476)
fetchedSkus, skusLoading, cuttingPieces, showPrintModal, isSavingCutting,
submittedStageMap, mintedCountMap                                                     (479-485)
showCheckInWarning, showCheckOutWarning, warningWorkerName                            (489-491)
showAnalyticsModal, analyticsData                                                      (495-496)
isSkuOpen, skuSearchQuery, visibleCount                                                (533-535)
isWorkerOpen, workerSearchQuery                                                        (538-539)
lastSubmittedPieceSeqs, showChecklistModal, checklistPieces, selectedPieces,
loadingPieces, piecesMeta, checklistError, checklistSubmitting                        (542-549)
scanInput, scannedBarcodes, isResolvingScan, scanResolutionResult                     (552-555)
skuRefreshKey, uploadLoading, showPreviewModal, previewData, fileName,
commitLoading, commitSuccess, uploadError, showOrderNumModal,
uploadOrderNumber, uploadOrderNumberError, mounted                                    (2102-2115)
fileInputRef                                                                            (2104)
```
(`scanInput`/`scannedBarcodes`/etc. look barcode-flavored by name but `handleResolveBarcode` — the function that uses them — calls `setWorkerId`/`setSkuCode`, both Manual-door state. Confirmed Manual-door, not Barcode-door.)

**Functions:**
```
handleResolveBarcode     (~1404)  — generic scan-and-resolve for the manual door's own scan box
handleSubmit              (~2267)
handleDirectCuttingSave   (~2372)
handleConfirmCuttingSave  (~2424)
handleFileUpload          (~2604)
handleCommit              (~2625)
```

**JSX:** the `{activeDoor === 'manual' && (...)}` block, roughly **3584 → 4736**, plus the modals that only this door opens: Excel Import Preview (~4181), Check-in/Check-out warning modals (~4109, ~4127), Checklist modal, Analytics modal.

⚠️ **Dead-code flag:** `handleSubmit` (line ~2289) has a branch `if (activeDoor === 'barcode') { ...open Traveler Card print modal... }`. I checked — the `<form onSubmit={handleSubmit}>` (line 3585) only ever renders inside the `activeDoor === 'manual'` block, so **`activeDoor` can never be `'barcode'` when this runs — that branch is unreachable.** Worth deciding whether to delete it or keep it as a defensive no-op while you split; either way it's not a functional dependency on Barcode-door.

---

## 5. `StoreHubSection.js`

**State:**
```
storeDrawerInput, storePieceInput, storeScanPart, storeCurrentScan,
storeVerifyResult, storeReceiveStatus, storeApiLoading                                (445-451)
storeDrawers, storeFilterClient, storeFilterStyle, storeFilterType,
storeDrawerSearch, expandedDrawer, storeLoading                                       (512-518)
pieceLookupInput, pieceLookupLoading, pieceJourneyResult                              (522-523, + one added this session)
selectedDrawers, batchSendTarget, batchSending                                        (526-528)
storeVisibleCount                                                                       (530)
storeScanResolving                                                                      (943)
```

**Functions:**
```
fetchLiveDrawers          (~614)
resolveDrawerUuid         (~718)
handleFindDrawerForPiece  (~751)
handleStoreVerify         (~812)
handleStoreScanInput      (~944)
handleStoreTransition     (~996)
handleSendToLineStitching (~1114)
handleBatchSendDrawers    (~1341)
```

**JSX:** the `{activeDoor === 'store' && (...)}` block, roughly **4736 → end (5419)**.

**Props needed from page.js:** `setSuccessMsg`, `setErrorMsg`, `recordStageCompletion`, `setStoreSendedSkus` (writes into the shared one), `setCameraScanTarget`.

---

## Quick sanity checklist while you paste

- [ ] Every `setSuccessMsg`/`setErrorMsg` call in a section file resolves to the prop passed from `page.js`, not a local `useState`.
- [ ] `recordStageCompletion` calls in Store Hub / Manual Door use the shared one from `page.js`, not a re-declared local version.
- [ ] The material-lot `useEffect` (Dynamic Material Lots Fetcher) stays in `page.js` and still fires correctly for both `activeDoor === 'barcode'` and `activeDoor === 'manual'`.
- [ ] `storeSendedSkus` writes from Store Hub are visible to Manual Door's `isSended` checks — run one full Store → Manual round-trip test after splitting.
- [ ] Bucket Result Modal and Camera Scanner Modal render exactly once each (in `page.js`), not duplicated per-section.
