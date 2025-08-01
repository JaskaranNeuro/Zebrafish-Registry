import { createSlice } from '@reduxjs/toolkit';

const racksSlice = createSlice({
  name: 'racks',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {
    setRacks: (state, action) => {
      // Validate payload to prevent HTML or invalid data
      const payload = action.payload;
      
      if (typeof payload === 'string' && payload.includes('<!doctype html>')) {
        console.error("Redux setRacks: Prevented HTML from being stored in state");
        state.items = [];
        return;
      }
      
      if (!Array.isArray(payload)) {
        console.error("Redux setRacks: Payload is not an array:", typeof payload);
        state.items = [];
        return;
      }
      
      state.items = payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  }
});

export const { setRacks, setLoading, setError } = racksSlice.actions;
export default racksSlice.reducer;