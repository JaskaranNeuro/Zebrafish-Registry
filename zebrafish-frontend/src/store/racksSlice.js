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
      state.items = action.payload;
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