import axios from "axios";
import API_CONFIG from "../config/apiConfig";
import { refreshAccessTokenThunk } from "../../features/auth/api/authThunk";
import { logout } from "../../features/auth/store/authReducer";

// Store Injection
let _store;

export const injectStore = (store) => {
  _store = store;
};

// Axios Setup
const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor - Adds token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Token Refresh Logic
let isRefreshing = false; // Tracks whether a token refresh request is already in progress
let waitingRequests = []; // Stores requests that failed with 401 while refresh is already happening. These requests will be retried later

// Goes through all queued requests, If refresh failed → reject them, If refresh succeeded → resolve them (so they retry) then Clears the queue
const resolveQueue = (error) => {
  waitingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  waitingRequests = [];
};

// Retry original request with updated token
const retryRequest = (originalRequest) => {
  return axiosInstance({
    ...originalRequest,
    headers: {
      ...originalRequest.headers,
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
};

// Response Interceptor - Handles expired tokens (401 errors)
axiosInstance.interceptors.response.use(
  (response) => response,

  async (err) => {
    const originalRequest = err.config;

    // Basic guards
    if (!originalRequest) return Promise.reject(err);
    if (originalRequest.url.includes("/refresh")) return Promise.reject(err);
    if (err.response?.status !== 401) return Promise.reject(err);
    if (!_store) return Promise.reject(new err("Store not injected"));
    if (originalRequest._retry) return Promise.reject(err);

    originalRequest._retry = true;

    // If refresh already happening → queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitingRequests.push({
          resolve: () => resolve(retryRequest(originalRequest)),
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      // Refresh token
      await _store.dispatch(refreshAccessTokenThunk()).unwrap();

      // Retry all queued requests
      resolveQueue(null);

      // Retry current request
      return retryRequest(originalRequest);
    } catch (refreshError) {
      // Fail all queued requests + logout
      resolveQueue(refreshError);
      _store.dispatch(logout());

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
