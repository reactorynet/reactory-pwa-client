import { combineReducers } from 'redux';

const nullReducer = function item_list(state = {}, action) {
  return state;
};

const rootReducer = combineReducers({ 
  nullReducer
});

export default rootReducer; 
