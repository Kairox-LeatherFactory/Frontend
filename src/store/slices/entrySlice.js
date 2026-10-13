import { createSlice } from '@reduxjs/toolkit';

const entrySlice = createSlice({
  name: 'entry',
  initialState: {
    // 1. General UI State
    activeDoor: 'manual', // 'barcode' | 'manual' | 'store' | 'breakdown'
    date: new Date().toISOString().slice(0, 10),
    successMsg: '',
    errorMsg: '',

    // 2. Barcode Door / Worker State
    barcodeWorker: null, // Logged in worker details
    barcodeStage: 'Cutting', // Production Stage
    
    // 3. Lot / Material State
    lotArticle: '',
    lotColor: '',
    lotThickness: '',
    lotResults: [],
    
    // 4. Barcode Pieces State
    cuttingBatchPieces: [],
    barcodeSelectedSku: null,
  },
  reducers: {
    setActiveDoor: (state, action) => { state.activeDoor = action.payload; },
    setDate: (state, action) => { state.date = action.payload; },
    setMessages: (state, action) => {
      if (action.payload.success !== undefined) state.successMsg = action.payload.success;
      if (action.payload.error !== undefined) state.errorMsg = action.payload.error;
    },
    setBarcodeWorker: (state, action) => { state.barcodeWorker = action.payload; },
    setBarcodeStage: (state, action) => { state.barcodeStage = action.payload; },
    setLotDetails: (state, action) => {
      const { article, color, thickness, results } = action.payload;
      if (article !== undefined) state.lotArticle = article;
      if (color !== undefined) state.lotColor = color;
      if (thickness !== undefined) state.lotThickness = thickness;
      if (results !== undefined) state.lotResults = results;
    },
    setCuttingBatchPieces: (state, action) => { state.cuttingBatchPieces = action.payload; },
    setBarcodeSelectedSku: (state, action) => { state.barcodeSelectedSku = action.payload; },
  }
});

export const { 
  setActiveDoor, setDate, setMessages, 
  setBarcodeWorker, setBarcodeStage, 
  setLotDetails, setCuttingBatchPieces, setBarcodeSelectedSku 
} = entrySlice.actions;

export default entrySlice.reducer;
