import { createSlice } from '@reduxjs/toolkit';

const storeHubSlice = createSlice({
  name: 'storeHub',
  initialState: {
    storePieceInput: "",
    storeScanPart: "LEATHER",
    storeCurrentScan: "",
    storeFilterClient: "All",
    storeFilterStyle: "All",
    storeFilterType: "All",
    storePieceSearch: "",
    expandedPiece: null,
    pieceLookupInput: "",
    batchSendTarget: "",
    selectedPieces: [], // Redux rules padi Set() thavirthu Array use panrom
  },
  reducers: {
    setStorePieceInput: (state, action) => { state.storePieceInput = action.payload; },
    setStoreScanPart: (state, action) => { state.storeScanPart = action.payload; },
    setStoreCurrentScan: (state, action) => { state.storeCurrentScan = action.payload; },
    setStoreFilters: (state, action) => {
      const { client, style, type, search } = action.payload;
      if (client !== undefined) state.storeFilterClient = client;
      if (style !== undefined) state.storeFilterStyle = style;
      if (type !== undefined) state.storeFilterType = type;
      if (search !== undefined) state.storePieceSearch = search;
    },
    setExpandedPiece: (state, action) => { state.expandedPiece = action.payload; },
    setPieceLookupInput: (state, action) => { state.pieceLookupInput = action.payload; },
    setBatchSendTarget: (state, action) => { state.batchSendTarget = action.payload; },
    
    toggleSelectedPiece: (state, action) => {
      const pieceId = action.payload;
      if (state.selectedPieces.includes(pieceId)) {
        state.selectedPieces = state.selectedPieces.filter(id => id !== pieceId);
      } else {
        state.selectedPieces.push(pieceId);
      }
    },
    clearSelectedPieces: (state) => { state.selectedPieces = []; }
  }
});

export const { 
  setStorePieceInput, setStoreScanPart, setStoreCurrentScan, 
  setStoreFilters, setExpandedPiece, setPieceLookupInput, setBatchSendTarget,
  toggleSelectedPiece, clearSelectedPieces
} = storeHubSlice.actions;

export default storeHubSlice.reducer;
