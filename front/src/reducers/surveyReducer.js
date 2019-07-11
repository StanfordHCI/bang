import {
  SURVEY_FETCHED,
  SURVEYS_FETCHED,
  SURVEY_ADDED,
  SURVEY_UPDATED,
  SURVEY_DELETED,
} from "../actions/surveys";

const initialState = {
  survey: null,
  surveyList: [],
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SURVEYS_FETCHED:
      return {
        ...state,
        surveyList: action.data
      };
    case SURVEY_FETCHED:
      return {
        ...state,
        survey: action.data,
      };
    case SURVEY_ADDED:
      return {
        ...state,
        survey: action.data,
        surveyList: [...state.surveyList, action.data],
      };
    case SURVEY_UPDATED:
      let updatedSurveyList = state.surveyList.slice();
      for (let i = 0; i < updatedSurveyList.length; i++) {
        if (updatedSurveyList[i]._id === action.data._id) {
          updatedSurveyList[i] = action.data;
          break;
        }
      }
      return {
        ...state,
        survey: action.data,
        surveyList: updatedSurveyList,
      };
    case SURVEY_DELETED:
      let deletedSurveyList = state.surveyList.slice();
      for (let i = 0; i < deletedSurveyList.length; i++) {
        if (deletedSurveyList[i]._id === action.data._id) {
          deletedSurveyList.splice(i, 1);
          break;
        }
      }
      return {
        ...state,
        surveyList: deletedSurveyList,
        survey: null
      };
    default:
      return state;
  }
}