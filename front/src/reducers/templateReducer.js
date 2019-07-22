import {
  TEMPLATE_FETCHED,
  TEMPLATES_FETCHED,
  TEMPLATE_ADDED,
  TEMPLATE_UPDATED,
  TEMPLATE_DELETED,
} from "../actions/templates";

const initialState = {
  template: null,
  templateList: [],
};

export default function (state = initialState, action) {
  switch (action.type) {
    case TEMPLATES_FETCHED:
      return {
        ...state,
        templateList: action.data
      };
    case TEMPLATE_FETCHED:
      let newTemplate = action.data;
      newTemplate.tasks.forEach(task => {
        if (!task.hasMidSurvey && task.survey) {
          task.hasMidSurvey = true;
        }
        return task;
      })

      return {
        ...state,
        template: newTemplate,
      };
    case TEMPLATE_ADDED:
      return {
        ...state,
        template: action.data,
        templateList: [...state.templateList, action.data],
      };
    case TEMPLATE_UPDATED:
      let updatedTemplateList = state.templateList.slice();
      for (let i = 0; i < updatedTemplateList.length; i++) {
        if (updatedTemplateList[i]._id === action.data._id) {
          updatedTemplateList[i] = action.data;
          break;
        }
      }
      return {
        ...state,
        template: action.data,
        templateList: updatedTemplateList,
      };
    case TEMPLATE_DELETED:
      let deletedTemplateList = state.templateList.slice();
      for (let i = 0; i < deletedTemplateList.length; i++) {
        if (deletedTemplateList[i]._id === action.data._id) {
          deletedTemplateList.splice(i, 1);
          break;
        }
      }
      return {
        ...state,
        templateList: deletedTemplateList,
        template: null
      };
    default:
      return state;
  }
}