import {
  BATCH_FETCHED,
  CHAT_FETCHED,
  REFRESH_BATCH,
  ADD_MESSAGE
} from "../actions/batches";

const initialState = {
  batch: null,
  currentTeam: [],
  teamAnimals: {},
  chat: {
    messages: [],
    members: [],
    batch: '',
    _id: '',
  }
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
      const batch = addValues(state.batch, action.data);
      return {
        ...state,
        batch: batch
      };
    case BATCH_FETCHED:
      return {
        ...state,
        batch: action.data
      };
    case CHAT_FETCHED:
      return {
        ...state,
        chat: action.data.chat,
        teamAnimals: action.data.teamAnimals,
        currentTeam: action.data.currentTeam
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