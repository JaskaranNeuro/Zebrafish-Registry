import { createSlice } from '@reduxjs/toolkit';

const breedingSlice = createSlice({
  name: 'breeding',
  initialState: {
    profiles: [],
    selectedProfile: null,
    plans: [],
    loading: false,
    error: null
  },
  reducers: {
    setProfiles: (state, action) => {
      state.profiles = action.payload;
    },
    setSelectedProfile: (state, action) => {
      state.selectedProfile = action.payload;
    },
    setPlans: (state, action) => {
      state.plans = action.payload;
    },
    addPlan: (state, action) => {
      state.plans.push(action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  }
});

export const { 
  setProfiles, 
  setSelectedProfile, 
  setPlans, 
  addPlan, 
  setLoading, 
  setError 
} = breedingSlice.actions;

export default breedingSlice.reducer;