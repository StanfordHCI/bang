import {
  APP_READY,
  SET_LOADING,
  SET_SNACKBAR,
  CLEAR_SNACKBAR,
  SET_SOCKET
} from "../actions/app";

const initialState = {
  user: null,
  appReady: true,
  loading: false,
  socket: null,
  snackbar: {message: '', open: false},
};


export default function (state = initialState, action) {
  switch (action.type) {
    case SET_SOCKET:
      return {
        ...state,
        socket: action.data
      };
    case SET_LOADING:
      return {
        ...state,
        loading: action.data
      };
    case APP_READY:
      return {...state, appReady: true};
    case SET_SNACKBAR:
      return {
        ...state,
        snackbar: {message: action.message, open: true}
      };
    case CLEAR_SNACKBAR:
      return {
        ...state,
        snackbar: {message: '', open: false}
      };
    default:
      return state;
  }
}