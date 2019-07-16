import {errorCatcher, setLoading, setSnackbar} from './app'
import {history} from '../app/history';
import {axios} from "./axiosConfig";
export const SURVEY_FETCHED = 'SURVEY_FETCHED';
export const SURVEYS_FETCHED = 'SURVEYS_FETCHED';
export const SURVEY_ADDED = 'SURVEY_ADDED';
export const SURVEY_UPDATED = 'SURVEY_UPDATED';
export const SURVEY_DELETED = 'SURVEY_DELETED';

export function updateSurvey(survey) {
  return dispatch => {
    dispatch(setLoading(true));

    return axios({
      method: 'put',
      url: 'admin/surveys/',
      data: survey,
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: SURVEY_UPDATED,
          data: response.data.survey
        });
        dispatch(setSnackbar('Survey was updated'))
        history.push('/surveys')
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function addSurvey(survey) {

  return dispatch => {
    dispatch(setLoading(true));
    return axios({
      method: 'post',
      url: 'admin/surveys/',
      data: survey,
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: SURVEY_ADDED,
          data: response.data.survey
        });
        dispatch(setSnackbar('added'))
        history.push('/surveys')
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function deleteSurvey(id) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'delete',
      url: 'admin/surveys/',
      data: {_id: id}
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: SURVEY_DELETED,
          data: {_id: id}
        });
        dispatch(setSnackbar('deleted'))
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function cloneSurvey(id) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'post',
      url: 'admin/surveys/clone/',
      data: {_id: id}
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: SURVEY_ADDED,
          data: response.data.survey
        });
        dispatch(setSnackbar('added'))
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}

export function loadSurveyList(params) {
  return dispatch => {
    dispatch(setLoading(true));
    return axios({
      method: 'get',
      url: 'admin/surveys/',
      params
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

export function loadSurvey(surveyId) {
  return (dispatch, getState) => {
    dispatch(setLoading(true));
    return axios({
      method: 'get',
      url: 'admin/surveys/' + surveyId +'/',
    })
      .then((response) => {
        dispatch(setLoading(false));
        dispatch({
          type: SURVEY_FETCHED,
          data: response.data.survey
        });
      })
      .catch(err => {
        errorCatcher(err, dispatch)
      });
  };
}