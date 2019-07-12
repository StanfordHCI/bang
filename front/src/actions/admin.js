import {errorCatcher, setLoading, setSnackbar} from './app'
import {history} from '../app/history';
import {axios} from "./axiosConfig";
export const BATCH_INFO_FETCHED = 'BATCH_INFO_FETCHED';
export const BATCH_ADDED = 'BATCH_ADDED';
export const BATCH_UPDATED = 'BATCH_UPDATED';
export const BATCH_DELETED = 'BATCH_DELETED';
export const CLEAR_BATCHES = 'CLEAR_BATCHES';
export const BATCHES_FETCHED = 'BATCHES_FETCHED';
export const CLEAR_TEMPLATES = 'CLEAR_TEMPLATES';
export const USER_DELETED = 'USER_DELETED';
export const USERS_FETCHED = 'USERS_FETCHED';
export const USER_ADDED = 'USER_ADDED';

export function updateBatch(batch) {
  return dispatch => {
    dispatch(setLoading(true));
    return axios({
      method: 'put',
      url: 'batches/',
      data: batch,
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: BATCH_UPDATED,
          data: response.data.batch
        });
        dispatch(setSnackbar('Batch was updated'))
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function addBatch(batch) {
  console.log(batch)
  return dispatch => {
    dispatch(setLoading(true));
    return axios({
      method: 'post',
      url: 'admin/batches/',
      data: batch,
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: BATCH_ADDED,
          data: response.data.batch
        });
        dispatch(setSnackbar('Batch was added'))
        history.push('/batches')
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function deleteBatch(id) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));

    return axios({
      method: 'delete',
      url: 'batches/' + id + '/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: BATCH_DELETED,
          data: {_id: id}
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function loadBatchList(params) {
  return dispatch => {
    dispatch(setLoading(true));

    return axios({
      method: 'get',
      url: 'admin/batches/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: BATCHES_FETCHED,
          data: response.data.batchList
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function loadBatch(batchId) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));

    return axios({
      method: 'get',
      url: 'batches/' + batchId + '/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: BATCH_INFO_FETCHED,
          data: response.data.batch
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function chooseBatch(batch) {
  return (dispatch) => {
    dispatch({
      type: BATCH_INFO_FETCHED,
      data: batch
    });
  };
}

export function clearBatches() {
  return (dispatch) => {
    dispatch({
      type: BATCHES_FETCHED,
      data: []
    });
  };
}

export function clearUsers() {
  return (dispatch) => {
    dispatch({
      type: USERS_FETCHED,
      data: []
    });
  };
}

export function loadBatchResult(id) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'get',
      url: 'admin/batch-result/' + id + '/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: BATCH_INFO_FETCHED,
          data: response.data.batch
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function stopBatch(id) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'put',
      url: 'admin/batches/' + id + '/stop/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: BATCH_UPDATED,
          data: response.data.batch
        });
        dispatch(setSnackbar('Batch was stopped'))
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function addUser() {
  return dispatch => {
    dispatch(setLoading(true));
    return axios({
      method: 'post',
      url: 'admin/users/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: USER_ADDED,
          data: response.data.user
        });
        dispatch(setSnackbar('added'))
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function loadUserList(params) {
  return dispatch => {
    dispatch(setLoading(true));

    return axios({
      method: 'get',
      url: 'admin/users/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: USERS_FETCHED,
          data: response.data.users
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function deleteUser(id) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'delete',
      url: 'admin/users/',
      data: {_id: id}
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: USER_DELETED,
          data: {_id: id}
        });
        dispatch(setSnackbar('deleted'))
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function notifyUsers(params) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'post',
      url: 'admin/notify/',
      data: params
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch(setSnackbar('Done'))
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}


