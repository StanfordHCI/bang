import {
  BATCH_FETCHED,
  CHAT_FETCHED,
  REFRESH_BATCH,
  ADD_MESSAGE,
  VOTED,
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
  let batch
  switch (action.type) {
    case REFRESH_BATCH:
      batch = addValues(state.batch, action.data);
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
    case VOTED:
      console.log('action data', action.data)
      batch = state.batch;
      const team = batch.rounds[batch.currentRound - 1].teams.find(x => x.users.some(y => y.user === action.data.user.toString()));
      console.log('team:', team)
      const teamIndex = batch.rounds[batch.currentRound - 1].teams.indexOf(team);
      console.log('teamIndex: ', teamIndex)
      batch.rounds[batch.currentRound - 1]['teams'][teamIndex]['currentPollVotes'] = action.data;
      console.log('updatedBatch: ', batch)
      return {
        ...state,
        batch: batch
      };

    default:
      return state;
  }
}