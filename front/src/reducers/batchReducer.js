import {
  BATCH_FETCHED,
} from "../actions/app";

const initialState = {
  batch: null,
};


export default function (state = initialState, action) {
  switch (action.type) {
    case BATCH_FETCHED:
      return {
        ...state,
        batch: action.data
      };
    default:
      return state;
  }
}