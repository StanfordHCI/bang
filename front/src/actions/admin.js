import {errorCatcher, setLoading, setSnackbar} from './app'
import {history} from '../app/history';
import {axios} from "./axiosConfig";
export const BATCH_INFO_FETCHED = 'BATCH_INFO_FETCHED';
export const BATCH_ADDED = 'BATCH_ADDED';
export const BATCH_UPDATED = 'BATCH_UPDATED';
export const BATCH_DELETED = 'BATCH_DELETED';
export const CLEAR_BATCHES = 'CLEAR_BATCHES';
export const BATCHES_FETCHED = 'BATCHES_FETCHED';
export const TEMPLATE_FETCHED = 'TEMPLATE_FETCHED';
export const TEMPLATES_FETCHED = 'TEMPLATES_FETCHED';
export const TEMPLATE_ADDED = 'TEMPLATE_ADDED';
export const TEMPLATE_UPDATED = 'TEMPLATE_UPDATED';
export const TEMPLATE_DELETED = 'TEMPLATE_DELETED';
export const CLEAR_TEMPLATES = 'CLEAR_TEMPLATES';
export const USER_DELETED = 'USER_DELETED';
export const USERS_FETCHED = 'USERS_FETCHED';


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
      url: 'batches/' + id,
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
      url: 'admin/batches',
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
      url: 'batches/' + batchId,
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

export function clearBatches(batch) {
  return (dispatch) => {
    dispatch({
      type: CLEAR_BATCHES,
    });
  };
}

export function updateTemplate(template) {
  return dispatch => {
    dispatch(setLoading(true));

    return axios({
      method: 'put',
      url: 'templates/',
      data: template,
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: TEMPLATE_UPDATED,
          data: response.data.template
        });
        dispatch(setSnackbar('Template was updated'))
        history.push('/templates')
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function addTemplate(template) {
  return dispatch => {
    dispatch(setLoading(true));
    return axios({
      method: 'post',
      url: 'admin/templates/',
      data: template,
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: TEMPLATE_ADDED,
          data: response.data.template
        });
        dispatch(setSnackbar('Template was added'))
        history.push('/templates')
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function deleteTemplate(id) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'delete',
      url: 'templates/' + id,
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: TEMPLATE_DELETED,
          data: {_id: id}
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function loadTemplateList(params) {
  return dispatch => {
    dispatch(setLoading(true));
    return axios({
      method: 'get',
      url: 'admin/templates',
      params
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: TEMPLATES_FETCHED,
          data: response.data.templateList
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function loadTemplate(templateId) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'get',
      url: 'templates/' + templateId,
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: TEMPLATE_FETCHED,
          data: response.data.template
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function chooseTemplate(template) {
  return (dispatch) => {
    dispatch({
      type: TEMPLATE_FETCHED,
      data: template
    });
  };
}

export function clearTemplates(template) {
  return (dispatch) => {
    dispatch({
      type: CLEAR_TEMPLATES,
    });
  };
}


