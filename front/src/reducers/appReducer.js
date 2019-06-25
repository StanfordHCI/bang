/** appreducer.js
 *  redux state manager
 * 
 *  reducer for general background app actions (e.g. snackbars)
 *  accessed by dispatch
 *
 *  called by:
 *    1. store.js
 */

 import {
  APP_READY,
  SET_LOADING,
  SET_SNACKBAR,
  CLEAR_SNACKBAR,
  SET_USER,
  INIT_SUCCESS,
  SET_CHAT_INFO
} from "../actions/app";

const initialState = {
  user: null,
  teamSize: 999,
  appReady: false,
  loading: false,
  socket: null,
  snackbar: {message: '', open: false},
};


export default function (state = initialState, action) {
  switch (action.type) {
    case SET_CHAT_INFO:
      let user = state.user;
      user.realNick = action.data.realNick;
      user.fakeNick = action.data.fakeNick;
      user.currentChat = action.data.currentChat;
      return {
        ...state,
        user: user,
      };
    case SET_USER:
      return {
        ...state,
        user: action.data,
      };
    case INIT_SUCCESS:
      return {
        ...state,
        user: action.data.user,
        teamSize: parseInt(action.data.teamSize)
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