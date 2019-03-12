import {default as axiosBase} from 'axios';
export const API_BASE = process.env.API_HOST.toString().replace(/"/g, ``) + 'api/';

export const axios = axiosBase.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
    "admintoken": localStorage.getItem('bang-admin-token')
  },
});




