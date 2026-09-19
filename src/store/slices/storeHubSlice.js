import { createSlice } from '@reduxjs/toolkit';

const storeHubSlice = createSlice({
  name: 'storeHub',
  initialState: {
    storeDrawerInput: "",
    storePieceInput: "",
    storeScanPart: "LEATHER",
    storeCurrentScan: "",
    storeFilterClient: "All",
    storeFilterStyle: "All",
    storeFilterType: "All",
    storeDrawerSearch: "",
    expandedDrawer: null,
    pieceLookupInput: "",
    batchSendTarget: "",
    selectedDrawers: [], // Redux rules padi Set() thavirthu Array use panrom
  },
  reducers: {
    setStoreDrawerInput: (state, action) => { state.storeDrawerInput = action.payload; },
    setStorePieceInput: (state, action) => { state.storePieceInput = action.payload; },
    setStoreScanPart: (state, action) => { state.storeScanPart = action.payload; },
    setStoreCurrentScan: (state, action) => { state.storeCurrentScan = action.payload; },
    setStoreFilters: (state, action) => {
      const { client, style, type, search } = action.payload;
      if (client !== undefined) state.storeFilterClient = client;
      if (style !== undefined) state.storeFilterStyle = style;
      if (type !== undefined) state.storeFilterType = type;
      if (search !== undefined) state.storeDrawerSearch = search;
    },
    setExpandedDrawer: (state, action) => { state.expandedDrawer = action.payload; },
    setPieceLookupInput: (state, action) => { state.pieceLookupInput = action.payload; },
    setBatchSendTarget: (state, action) => { state.batchSendTarget = action.payload; },
    
    // Set ku badhila manual ah element add/remove panradhuku:
    toggleSelectedDrawer: (state, action) => {
      const drawerId = action.payload;
      if (state.selectedDrawers.includes(drawerId)) {
        state.selectedDrawers = state.selectedDrawers.filter(id => id !== drawerId);
      } else {
        state.selectedDrawers.push(drawerId);
      }
    },
    clearSelectedDrawers: (state) => { state.selectedDrawers = []; }
  }
});

export const { 
  setStoreDrawerInput, setStorePieceInput, setStoreScanPart, setStoreCurrentScan, 
  setStoreFilters, setExpandedDrawer, setPieceLookupInput, setBatchSendTarget,
  toggleSelectedDrawer, clearSelectedDrawers
} = storeHubSlice.actions;

export default storeHubSlice.reducer;
