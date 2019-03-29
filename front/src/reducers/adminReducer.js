import {
  BATCH_INFO_FETCHED,
  BATCHES_FETCHED,
  BATCH_ADDED,
  BATCH_UPDATED,
  BATCH_DELETED,
  TEMPLATE_FETCHED,
  TEMPLATES_FETCHED,
  TEMPLATE_ADDED,
  TEMPLATE_UPDATED,
  TEMPLATE_DELETED,
  USERS_FETCHED,
  USER_DELETED
} from "../actions/admin";

const initialState = {
  batch: null,
  batchList: [],
  template: null,
  templateList: [],
  userList: []
};

export default function (state = initialState, action) {
  switch (action.type) {
    case USERS_FETCHED:
      return {
        ...state,
        userList: action.data
      };
    case USER_DELETED:
      let deletedUserList = state.batchList.slice();
      for (let i = 0; i < deletedUserList.length; i++) {
        if (deletedUserList[i]._id === action.data._id) {
          deletedUserList.splice(i, 1);
          break;
        }
      }
      return {
        ...state,
        userList: deletedUserList,
      };
    case BATCHES_FETCHED:
      return {
        ...state,
        batchList: action.data
      };
    case BATCH_INFO_FETCHED:
      return {
        ...state,
        batch: action.data
      };
    case BATCH_ADDED:
      return {
        ...state,
        batch: action.data,
        batchList: [...state.batchList, action.data],
      };
    case BATCH_UPDATED:
      let updatedBatchList = state.batchList.slice();
      for (let i = 0; i < updatedBatchList.length; i++) {
        if (updatedBatchList[i]._id === action.data._id) {
          updatedBatchList[i] = action.data;
          break;
        }
      }
      return {
        ...state,
        batch: action.data,
        batchList: updatedBatchList,
      };
    case BATCH_DELETED:
      let deletedBatchList = state.batchList.slice();
      for (let i = 0; i < deletedBatchList.length; i++) {
        if (deletedBatchList[i]._id === action.data._id) {
          deletedBatchList.splice(i, 1);
          break;
        }
      }
      return {
        ...state,
        batchList: deletedBatchList,
        batch: null
      };
    case TEMPLATES_FETCHED:
      return {
        ...state,
        templateList: action.data
      };
    case TEMPLATE_FETCHED:
      return {
        ...state,
        template: action.data
      };
    case TEMPLATE_ADDED:
      return {
        ...state,
        template: action.data,
        templateList: [...state.batchList, action.data],
      };
    case TEMPLATE_UPDATED:
      let updatedTemplateList = state.batchList.slice();
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
      let deletedTemplateList = state.batchList.slice();
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