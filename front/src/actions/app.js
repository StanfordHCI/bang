import {history} from '../app/history';
import constants from "../constants"
import openSocket from 'socket.io-client';
const adr = process.env.API_HOST.substr(1, process.env.API_HOST.length - 2);
let socket = openSocket(adr);
console.log(socket, adr)

export const GET_ACCOUNT_SUCCESS = 'GET_ACCOUNT_SUCCESS';
export const APP_READY = 'APP_READY';
export const CLEAR_REG_ERRORS = 'CLEAR_ERRORS';
export const SET_LOADING = 'SET_LOADING';
export const ACCOUNT_LOGOUT = 'ACCOUNT_LOGOUT';
export const SET_SNACKBAR = 'SET_SNACKBAR';
export const CLEAR_SNACKBAR = 'CLEAR_SNACKBAR';
export const BATCH_FETCHED = 'BATCH_FETCHED';
export const SET_SOCKET = 'SET_SOCKET';



const getUrlVars = url => {
  let myJson = {};
  url
    .slice(url.indexOf("?") + 1)
    .split("&")
    .forEach(varString => {
      const varList = varString.split("=");
      myJson[varList[0]] = varList[1];
    });
  return myJson;
};

const decodeURL = toDecode => {
  return unescape(toDecode.replace(/\+/g, " "));
};

export const whoami = () => {
  return function (dispatch) {
    const token = localStorage.getItem('bang-token');

    if (token) {
      dispatch(setLoading(true));
      socket.emit('init', {token: token})

    } else {
      const URLvars = getUrlVars(window.location.href);
      console.log(URLvars)

      if  (!URLvars.workerId || !URLvars.assignmentId || !URLvars.hitId || !URLvars.turkSubmitTo) { //not logged, wrong info
        dispatch({
          type: APP_READY,
        });
      } else {
        dispatch(setLoading(true));
        const ids = {
          mturkId: URLvars.workerId,
          assignmentId: URLvars.assignmentId,
          hitId: URLvars.hitId,
          turkSubmitTo: URLvars.turkSubmitTo,
        }
        socket.emit('init', ids)
      }
    }
    socket.on('init-res', (data) => {
      dispatch(setLoading(false));
      if (!data || !data.user) {
        dispatch(setSnackbar('bad init'));
        return;
      }
      const batch = data.user.batch;
      //init goes right
      let user  = Object.create(data.user);
      delete (user.batch)
      dispatch({
        type: GET_ACCOUNT_SUCCESS,
        data: user
      });
      dispatch({
        type: APP_READY,
      });
      if (batch) {
        dispatch({
          type: BATCH_FETCHED,
          data: batch
        });
        history.push('/batch');
      } else {
        history.push('/waiting');
      }
    });

  }
}
export const setLoading = (value) => {
  return (dispatch, getState) => {
    dispatch({type: SET_LOADING, data: value});
  }
};

export const errorCatcher = (err, dispatch, msg = 'Something went wrong') => {
  console.log(err);
  dispatch(setSnackbar(msg));
  dispatch(setLoading(false))
};

export const clearErrors = () => {
  return dispatch => {
    dispatch({type: CLEAR_REG_ERRORS})
  }
};

export const setSnackbar = (message) => {
  return {
    type: SET_SNACKBAR,
    message
  }
};

export const clearSnackbar = (message) => {
  return {
    type: CLEAR_SNACKBAR,
  }
};
