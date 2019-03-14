import {SET_CHAT_INFO, SET_USER, setSnackbar, socket} from "./app";
import {history} from "../app/history";

export const BATCH_FETCHED = 'BATCH_FETCHED';
export const CHAT_FETCHED = 'CHAT_FETCHED';
export const REFRESH_BATCH = 'REFRESH_BATCH';
export const ADD_MESSAGE = 'ADD_MESSAGE'

export const joinBatch = () => {
  return function (dispatch) {
    socket.emit('join-batch', {});
    socket.once('joined-batch', (data) =>{
      dispatch({
        type: SET_USER,
        data: data.user
      });
      dispatch(setSnackbar('Success!'));
      history.push('/batch');
    })
  }
}

export const sendMessage = (message) => {
  return function (dispatch) {
    socket.emit('send-message', message);
  }
}

export const submitSurvey = (data) => {
  return function (dispatch) {
    console.log(data)
    socket.emit('send-survey', data);
  }
}

export const loadBatch = () => {
  return function (dispatch, getState) {
    const user = getState().app.user;
    if (!user.batch) {
      dispatch(setSnackbar('User does not have batch'));
      history.push('/waiting')
      return;
    }
    socket.emit('load-batch', {batch: user.batch})
    socket.on('loaded-batch', (data) =>{
      dispatch({
        type: BATCH_FETCHED,
        data: data.batch
      });
      dispatch({
        type: CHAT_FETCHED,
        data: data.chat
      });
      if (data.userInfo) {
        dispatch({
          type: SET_CHAT_INFO,
          data: data.userInfo
        });
      }
    })

    //batch events
    socket.on('start-batch', (data) =>{
      dispatch(setSnackbar('Batch start'));
      dispatch({
        type: REFRESH_BATCH,
        data: data
      });
    })
    socket.on('end-batch', (data) =>{
      dispatch(setSnackbar('Batch end'));
      dispatch({
        type: REFRESH_BATCH,
        data: data
      });
    })
    socket.on('start-round', (data) =>{
      dispatch(setSnackbar('Round start'));
      dispatch({
        type: REFRESH_BATCH,
        data: data
      });
    })
    socket.on('mid-round', (data) =>{
      dispatch(setSnackbar('Mid survey'));
      dispatch({
        type: REFRESH_BATCH,
        data: data
      });
    })
    socket.on('end-round', (data) =>{
      dispatch(setSnackbar('Round end'));
      dispatch({
        type: REFRESH_BATCH,
        data: data
      });
    })
    socket.on('receive-message', (data) =>{
      dispatch({
        type: ADD_MESSAGE,
        data: data
      });
    })
    socket.on('refresh-batch', (data) =>{
      socket.emit('load-batch', {batch: user.batch})
    })
  }
}
