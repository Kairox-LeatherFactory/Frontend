import { createSlice } from '@reduxjs/toolkit';

const manualSlice = createSlice({
  name: 'manual',
  initialState: {
    selectedStage: "Cutting",
    workerId: "",
    skuCode: "",
    pieceSeqs: "",
    cuttingCount: "",
    skuSearchQuery: "",
    workerSearchQuery: "",
  },
  reducers: {
    setSelectedStage: (state, action) => { state.selectedStage = action.payload; },
    setWorkerId: (state, action) => { state.workerId = action.payload; },
    setSkuCode: (state, action) => { state.skuCode = action.payload; },
    setPieceSeqs: (state, action) => { state.pieceSeqs = action.payload; },
    setCuttingCount: (state, action) => { state.cuttingCount = action.payload; },
    setSkuSearchQuery: (state, action) => { state.skuSearchQuery = action.payload; },
    setWorkerSearchQuery: (state, action) => { state.workerSearchQuery = action.payload; },
  }
});

export const { 
  setSelectedStage, setWorkerId, setSkuCode, setPieceSeqs, 
  setCuttingCount, setSkuSearchQuery, setWorkerSearchQuery 
} = manualSlice.actions;

export default manualSlice.reducer;
