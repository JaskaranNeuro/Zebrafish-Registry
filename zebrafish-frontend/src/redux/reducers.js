import { combineReducers } from 'redux';
import { SET_RACKS, ADD_RACK, UPDATE_RACK, DELETE_RACK } from './actions';

const initialRacksState = [];

const racksReducer = (state = initialRacksState, action) => {
  switch (action.type) {
    case SET_RACKS:
      return action.payload;
      
    case ADD_RACK:
      return [...state, action.payload];
      
    case UPDATE_RACK:
      return state.map(rack => 
        rack.id === action.payload.id ? action.payload.rack : rack
      );
      
    case DELETE_RACK:
      return state.filter(rack => rack.id !== action.payload);
      
    default:
      return state;
  }
};

const rootReducer = combineReducers({
  racks: racksReducer,
  // Add other reducers here as needed
});

export default rootReducer;