
export default function (state, action) {
}
switch (action.type) {
    case USER_LIST_CHANGED:
        return {
            ...state,
            filteredUserList: action.data.filteredUserList,
        }
    default:
        return state;
}
