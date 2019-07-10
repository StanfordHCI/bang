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
export const USER_ADDED = 'USER_ADDED';
export const SURVEYS_FETCHED = 'SURVEYS_FETCHED'

export function loadSurveyList() {
  return dispatch => {
    dispatch(setLoading(true));

    return axios({
      method: 'get',
      url: 'admin/surveys/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: SURVEYS_FETCHED,
          data: response.data.surveyList
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

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

export function updateTemplate(template) {
  return dispatch => {
    dispatch(setLoading(true));

    return axios({
      method: 'put',
      url: 'admin/templates/',
      data: generateSelectOptions(template),
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
      data: generateSelectOptions(template),
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: TEMPLATE_ADDED,
          data: response.data.template
        });
        dispatch(setSnackbar('added'))
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
      url: 'admin/templates/',
      data: {_id: id}
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: TEMPLATE_DELETED,
          data: {_id: id}
        });
        dispatch(setSnackbar('deleted'))
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function cloneTemplate(id) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'post',
      url: 'admin/templates/clone/',
      data: {_id: id}
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: TEMPLATE_ADDED,
          data: response.data.template
        });
        dispatch(setSnackbar('added'))
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
      url: 'admin/templates/',
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
      url: 'admin/templates/' + templateId +'/',
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

export function notifyUsers(message) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'post',
      url: 'admin/notify/',
      data: {message: message}
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

const generateSelectOptions = (template) => {
  template.tasks.forEach(task => {
    task.survey.forEach(survey => {
      if (survey.type === 'select') {
        survey.selectOptions = survey.options.map((x, index) => {return {value: index, label: x.option}})
      }
      return survey;
    })
    return task;
  })
  return template
}



