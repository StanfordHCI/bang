import {errorCatcher, setLoading, setSnackbar} from './app'
import {history} from '../app/history';
import {axios} from "./axiosConfig";
import {CLEAR_TEMPLATES} from "./admin";
export const TEMPLATE_FETCHED = 'TEMPLATE_FETCHED';
export const TEMPLATES_FETCHED = 'TEMPLATES_FETCHED';
export const TEMPLATE_ADDED = 'TEMPLATE_ADDED';
export const TEMPLATE_UPDATED = 'TEMPLATE_UPDATED';
export const TEMPLATE_DELETED = 'TEMPLATE_DELETED';

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
    if (task.hasPreSurvey) task.preSurvey.forEach(preSurvey => {
      if (preSurvey.type === 'select') {
        preSurvey.selectOptions = preSurvey.options.map((x, index) => {return {value: index, label: x.option}})
      }
      return preSurvey;
    })
    if (task.hasMidSurvey) task.survey.forEach(survey => {
      if (survey.type === 'select') {
        survey.selectOptions = survey.options.map((x, index) => {return {value: index, label: x.option}})
      }
      return survey;
    })
    return task;
  })
  if (template.hasPostSurvey) {
    template.postSurvey.forEach(postSurvey => {
      if (postSurvey.type === 'select') {
        postSurvey.selectOptions = postSurvey.options.map((x, index) => {return {value: index, label: x.option}})
      }
    })
  }
  return template
}
