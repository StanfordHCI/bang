/** app.js
 *  client-side controller
 *
 *  logic to process most recent action and push correct route to window
 *  e.g. push not-logged, or push /batch if batch is starting.
 *
 *  called by:
 *     ???
 */

import { history } from "../app/history";
import constants from "../constants";
import openSocket from "socket.io-client";
import { getUrlParams } from "../utils";
const adr = process.env.API_HOST.substr(1, process.env.API_HOST.length - 2);
export let socket = openSocket(adr);
export const listener = function(ev) {
  return (ev.returnValue = `Are you sure you want to leave?`);
};
export const INIT_SUCCESS = "INIT_SUCCESS";
export const SET_USER = "SET_USER";
export const APP_READY = "APP_READY";
export const CLEAR_REG_ERRORS = "CLEAR_ERRORS";
export const SET_LOADING = "SET_LOADING";
export const ACCOUNT_LOGOUT = "ACCOUNT_LOGOUT";
export const SET_CHAT_INFO = "SET_CHAT_INFO";
export const SET_SNACKBAR = "SET_SNACKBAR";
export const CLEAR_SNACKBAR = "CLEAR_SNACKBAR";

const getUrlVars = (url) => {
  let myJson = {};
  url
    .slice(url.indexOf("?") + 1)
    .split("&")
    .forEach((varString) => {
      const varList = varString.split("=");
      myJson[varList[0]] = varList[1];
    });
  return myJson;
};

const decodeURL = (toDecode) => {
  return unescape(toDecode && toDecode.replace(/\+/g, " "));
};

export const whoami = () => {
  return function(dispatch) {
    const token = localStorage.getItem("bang-token");
    // admintoken has to be in lower case
    const adminToken =
      getUrlParams().admintoken || localStorage.getItem("bang-admin-token");
    let link = window.location.href;

    if (link.indexOf("unsubscribe") !== -1) {
      dispatch({
        type: APP_READY,
      });

      let unsubLink = link.slice(link.indexOf("unsubscribe"));
      history.push(`/${unsubLink}`);
    } else {
      const URLvars = getUrlVars(link);
      let initData = {
        mturkId: URLvars.workerId,
        assignmentId: URLvars.assignmentId,
        hitId: URLvars.hitId,
        turkSubmitTo: decodeURL(URLvars.turkSubmitTo),
      };
      if (adminToken) {
        initData.adminToken = adminToken;
      }

      if (token) {
        initData.token = token;
        dispatch(setLoading(true));
        socket.emit("init", initData);
      } else {
        if (!initData.mturkId || !initData.assignmentId) {
          //not logged, wrong info
          dispatch({
            type: APP_READY,
          });

          dispatch(setSnackbar("wrong credentials"));
          localStorage.clear();
          history.push("/not-logged");
        } else {
          dispatch(setLoading(true));
          socket.emit("init", initData);
          //history.push('/waiting')
        }
      }
      socket.once("init-res", (data) => {
        dispatch(setLoading(false));
        if (!data || !data.user) {
          //init goes wrong
          dispatch({
            type: APP_READY,
          });
          dispatch(setSnackbar("wrong credentials"));
          history.push("/not-logged");
          return;
        }
        //init goes right
        if (!token || token !== data.user.token) {
          localStorage.setItem("bang-token", data.user.token);
        }
        dispatch({
          type: INIT_SUCCESS,
          data: { user: data.user },
        });
        dispatch({
          type: APP_READY,
        });
        if (!data.user.isAdmin) {
          if (data.user.systemStatus === "willbang") {
            const [batchId, genNumber] = [
              getUrlParams().batchid,
              getUrlParams().gennumber,
            ];
            if (batchId && genNumber) {
              history.push(
                "/waiting" + "?batchId=" + batchId + "&genNumber=",
                genNumber
              );
            }
            if (data.user.batch) {
              history.push("/batch");
            } else {
              history.push("/waiting");
            }
          } else if (data.user.systemStatus === "hasbanged") {
            history.push("/batch-end");
          }
        } else {
          localStorage.setItem("bang-admin-token", data.adminToken);
        }
      });
      socket.on("send-error", (data) => {
        dispatch(setSnackbar(data));
      });
      socket.on("kick-afk", (data) => {
        window.removeEventListener("beforeunload", listener);
        history.push("/kicked");
      });
      socket.on("stop-batch", (batch) => {
        dispatch(setSnackbar("Batch was stopped"));
        if (batch.status === "waiting") {
          history.push("/waiting");
        } else if (batch.status === "active") {
          history.push("/batch-end");
        }
      });
      socket.emit("send-error", "There is no right batch");
    }
  };
};

export const setLoading = (value) => {
  return (dispatch, getState) => {
    dispatch({ type: SET_LOADING, data: value });
  };
};

export const errorCatcher = (err, dispatch, msg = "Something went wrong") => {
  console.log(err);
  dispatch(setSnackbar(msg));
  dispatch(setLoading(false));
};

export const clearErrors = () => {
  return (dispatch) => {
    dispatch({ type: CLEAR_REG_ERRORS });
  };
};

export const setSnackbar = (message) => {
  return {
    type: SET_SNACKBAR,
    message,
  };
};

export const clearSnackbar = (message) => {
  return {
    type: CLEAR_SNACKBAR,
  };
};

export const joinBang = (id) => {
  return function(dispatch) {
    dispatch(setLoading(true));
    socket.emit("join-bang", {});
    window.location.href =
      "https://bang-dev.deliveryweb.ru/accept?assignmentId=" + id;
  };
};
