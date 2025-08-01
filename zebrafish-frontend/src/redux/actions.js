// Action Types
export const SET_RACKS = 'SET_RACKS';
export const ADD_RACK = 'ADD_RACK';
export const UPDATE_RACK = 'UPDATE_RACK';
export const DELETE_RACK = 'DELETE_RACK';

// Action Creators
export const setRacks = (racks) => ({
  type: SET_RACKS,
  payload: racks
});

export const addRack = (rack) => ({
  type: ADD_RACK,
  payload: rack
});

export const updateRack = (rackId, updatedRack) => ({
  type: UPDATE_RACK,
  payload: {
    id: rackId,
    rack: updatedRack
  }
});

export const deleteRack = (rackId) => ({
  type: DELETE_RACK,
  payload: rackId
});