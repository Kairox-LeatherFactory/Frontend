import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,    // The role (e.g., 'admin', 'lining_manager')
    token: null,   // JWT Token
  },
  reducers: {
    setAuthCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    }
  }
});

export const { setAuthCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
