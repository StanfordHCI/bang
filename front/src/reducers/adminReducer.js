import {
  BATCH_INFO_FETCHED,
  BATCHES_FETCHED,
  BATCH_ADDED,
  BATCH_UPDATED,
  BATCH_DELETED,
  USERS_FETCHED,
  USER_DELETED,
  USER_ADDED,
  SWITCH_EMPTY_BATCHES_VISIBILITY,
  BONUS_PAID,
  LOGS_FETCHED,
} from "../actions/admin";

const initialState = {
  batch: null,
  batchList: [],
  userList: [],
  willbangLength: 0,
  hideEmptyBatches: (localStorage.getItem('hideEmptyBatches') || 'show') === 'hide',
};

export default function (state = initialState, action) {
  switch (action.type) {
    case USERS_FETCHED:
      return {
        ...state,
        userList: action.data,
        willbangLength: action.data.filter(x => x.systemStatus === 'willbang' && !x.isTest).length
      };
    case USER_DELETED:
      let deletedUserList = state.userList.slice();
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
    case USER_ADDED:
      return {
        ...state,
        userList: [...state.userList, action.data],
      };
    case SWITCH_EMPTY_BATCHES_VISIBILITY:
      return {
        ...state,
        hideEmptyBatches: action.data,
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
    case BONUS_PAID:
      return {
        ...state,
        userList: action.data.users,
      }
    case LOGS_FETCHED:
      return {
        ...state,
        logs: action.data.logs,
        errorLogs: action.data.errorLogs,
      }
    default:
      return state;
  }
}