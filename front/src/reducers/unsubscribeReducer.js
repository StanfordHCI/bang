import {
    USER_UNSUBSCRIBED,
    USER_WAS_NOT_FOUND,
    USER_HAS_BANGED
} from '../actions/unsubscribe'

const initialState = {
    mturkId: "",
    status: ""
}

export default function (state = initialState, action) {
    switch (action.type) {
        case USER_UNSUBSCRIBED:
            const mturkId = action.data.user
            return {
                ...state,
                mturkId,
                status: "You were successfully removed from the mailing list"
            }
        case USER_WAS_NOT_FOUND:
            return {
                ...state,
                mturkId: "",
                status: "Your MTurkId was not found"
            }
        case USER_HAS_BANGED:
            return {
                ...state,
                mturkId: "",
                status: "You seem to have completed a survey. Please contact us at stanford.hci.mturk@gmail.com if you still receive emails"
            }
        default:
            return state
    }
}

