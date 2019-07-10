import { errorCatcher, setLoading } from "./app"
import { axios } from "./axiosConfig";

export const USER_UNSUBSCRIBED = "USER_UNSUBSCRIBED";
export const USER_WAS_NOT_FOUND = "USER_WAS_NOT_FOUND";
export const USER_HAS_BANGED = "USER_HAS_BANGED";

export function unsubscribe(id) {
  return function (dispatch) {
    dispatch(setLoading(true));
    return axios({
      method: "delete",
      url: `public/unsubscribe/${id}`
    })
      .then(response => {
        dispatch(setLoading(false));
        let resData = response.data;

        if (resData.error === 0 && resData.user !== "") {
          dispatch({
            type: USER_UNSUBSCRIBED,
            data: resData.user
          });
        } else {
          if (resData.error === 2) {
            dispatch({
              type: USER_WAS_NOT_FOUND,
              data: {}
            });
          } else {
            dispatch({
              type: USER_HAS_BANGED,
              data: {}
            });
          }
        }
      })
      .catch(err => {
        errorCatcher(err, dispatch);
      });
  };
}
