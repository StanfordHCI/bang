import {history} from '../app/history';
import constants from "../constants"

export const GET_ACCOUNT_REQUEST = 'GET_ACCOUNT_REQUEST';
export const GET_ACCOUNT_SUCCESS = 'GET_ACCOUNT_SUCCESS';
export const PWDRST_REQUEST_REQUEST = 'PWDRST_REQUEST_REQUEST';
export const PWDRST_REQUEST_SUCCESS = 'PWDRST_REQUEST_SUCCESS';
export const PWDRST_STATUS_REQUEST = 'PWDRST_STATUS_REQUEST';
export const PWDRST_STATUS_SUCCESS = 'PWDRST_STATUS_SUCCESS';
export const PWDRST_CONFIRM_SUCCESS = 'PWDRST_CONFIRM_SUCCESS';
export const APP_READY = 'APP_READY';
export const SWITCH_AUTH_ERROR = 'SWITCH_AUTH_ERROR';
export const SWITCH_REG_ERROR = 'SWITCH_REG_ERROR';
export const UPDATE_PROFILE_ERROR = 'SWITCH_UPDATE_PROFILE_ERROR';
export const CLEAR_UPDATE_PROFILE_ERROR = 'CLEAR_UPDATE_PROFILE_ERROR';
export const CLEAR_CHANGE_PASSWORD_RESULT = 'CLEAR_CHANGE_PASSWORD_RESULT';
export const SUCCESS_CHANGE_PASSWORD_RESULT = 'SUCCESS_CHANGE_PASSWORD_RESULT';
export const CLEAR_REG_ERRORS = 'CLEAR_ERRORS';
export const SET_LOADING = 'SET_LOADING';
export const ACCOUNT_LOGOUT = 'ACCOUNT_LOGOUT';
export const SET_SNACKBAR = 'SET_SNACKBAR';
export const CLEAR_SNACKBAR = 'CLEAR_SNACKBAR';

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

export function clearChangePasswordError() {
  return dispatch => dispatch({
    type: CLEAR_UPDATE_PROFILE_ERROR
  })
}

export function clearChangePasswordResult() {
  return dispatch => dispatch({
    type: CLEAR_CHANGE_PASSWORD_RESULT
  })
}