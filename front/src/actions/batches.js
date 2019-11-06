import {SET_CHAT_INFO, SET_USER, setSnackbar, socket} from "./app";
import {history} from "../app/history";

export const BATCH_FETCHED = 'BATCH_FETCHED';
export const CHAT_FETCHED = 'CHAT_FETCHED';
export const REFRESH_BATCH = 'REFRESH_BATCH';
export const ADD_MESSAGE = 'ADD_MESSAGE';
export const VOTED = 'VOTED'

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
    dispatch(setSnackbar('Survey submitted'));
    socket.emit('send-survey', data);
  }
}

export const refreshActiveUsers = () => {
  socket.emit('refresh-active-users', {});
}

export const vote = (data) => {
  return function (dispatch) {
    console.log('voted')
    socket.emit('vote', data);
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
      let chat = data.chat;
      let teamAnimals, currentTeam;
      if (data.batch.status === 'active') {
        teamAnimals = {}
        currentTeam = chat.members.map(x => {
          let animalIndex;
          const nick = data.batch.maskType === 'unmasked' || x._id.toString() === user._id.toString() ? x.realNick : x.fakeNick;
          if (!nick) return ''
          if (nick) for (let i = 0; i < nick.length; i++) {
            if (nick[i] === nick[i].toUpperCase()) {
              animalIndex = i;
              break;
            }
          }
          let animal = nick.slice(animalIndex, nick.length)
          teamAnimals[animal] = nick;
          return nick
        })
      }
      dispatch({
        type: CHAT_FETCHED,
        data: {chat: chat, currentTeam: currentTeam, teamAnimals: teamAnimals}
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
    socket.on('start-task', (data) =>{
      dispatch(setSnackbar('Round start'));
      dispatch({
        type: REFRESH_BATCH,
        data: data
      });
    })
    socket.on('mid-survey', (data) =>{
      dispatch(setSnackbar('Middle survey'));
      dispatch({
        type: REFRESH_BATCH,
        data: data
      });
    })
    socket.on('post-survey', (data) => {
      dispatch(setSnackbar('Post Survey'));
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
    });
    socket.on('reading-period', data => {
      dispatch(setSnackbar('Reading Period'));
      dispatch({
        type: REFRESH_BATCH,
        data: data,
      })
    });
    socket.on('pre-survey', data => {
      dispatch(setSnackbar('Pre-Survey'));
      dispatch({
        type: REFRESH_BATCH,
        data: data,
      })
    });
    socket.on('prepre-survey', data => {
      dispatch(setSnackbar('Pre-Survey'));
      dispatch({
        type: REFRESH_BATCH,
        data: data,
      })
    });
    socket.on('voted', data => {
      dispatch(setSnackbar('Successfully voted!'));
      dispatch({
        type: VOTED,
        data: data,
      })
    })
  }
}
