import { configureStore } from '@reduxjs/toolkit';
import racksReducer from './racksSlice';
import breedingReducer from './breedingSlice';

// Create a single export for the store
const store = configureStore({
  reducer: {
    racks: racksReducer,
    breeding: breedingReducer
  },
});

export default store;