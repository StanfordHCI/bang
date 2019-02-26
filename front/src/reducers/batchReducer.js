import {
  BATCH_FETCHED,
  CHAT_FETCHED,
  BATCHES_FETCHED,
  REFRESH_BATCH,
  ADD_MESSAGE
} from "../actions/batches";

const initialState = {
  batch: null,
  chat: {
    messages: [],
    members: [],
    batch: '',
    _id: ''
  },
  batchList: [],
};

const addValues = (base, add) => {
  for (let i in add) {
    base[i] = add[i]
  }
  return base;
}


export default function (state = initialState, action) {
  switch (action.type) {
    case REFRESH_BATCH:
      console.log(state.batch, action.data)
      const batch = addValues(state.batch, action.data);
      console.log(batch)
      return {
        ...state,
        batch: batch
      };
    case BATCHES_FETCHED:
      return {
        ...state,
        batchList: action.data
      };
    case BATCH_FETCHED:
      return {
        ...state,
        batch: action.data
      };
    case CHAT_FETCHED:
      return {
        ...state,
        chat: action.data
      };
    case ADD_MESSAGE:
      let chat = state.chat;
      chat.messages.push(action.data)
      return {
        ...state,
        chat: chat
      };
    default:
      return state;
  }
}