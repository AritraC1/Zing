import axios from "axios";
import API_CONFIG from "../config/apiConfig";
import { refreshAccessTokenThunk } from "../../features/auth/api/authThunk";
import { logout } from "../../features/auth/store/authReducer";

// Store holder+ injector
let _store;

export const injectStore = (store) => {
  _store = store;
};

const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
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

// This code ensures that when a token expires, only one refresh request is made, and all other failed requests wait and retry after the token is refreshed.

let isRefreshing = false; // Tracks whether a token refresh request is already in progress
let failedQueue = []; // Stores requests that failed with 401 while refresh is already happening. These requests will be retried later

// Goes through all queued requests, If refresh failed → reject them, If refresh succeeded → resolve them (so they retry) then Clears the queue
const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

// handling expired access tokens with a single refresh request + queueing system to prevent backend spam
axiosInstance.interceptors.response.use(
  (response) => response,
  async (err) => {
    const originalRequest = err.config;

    if (!originalRequest) return Promise.reject(err);

    if (originalRequest.url.includes("/refresh")) return Promise.reject(err);

    if (err.response?.status !== 401) return Promise.reject(err);

    if (!_store) return Promise.reject(new Error("Store not injected yet"));

    if (originalRequest._retry) return Promise.reject(err);

    originalRequest._retry = true;

    // Helper to safely retry a request
    const retryRequest = () =>
      axiosInstance({
        ...originalRequest,
        url: originalRequest.url, // preserve url
        baseURL: API_CONFIG.BASE_URL, // preserve baseURL
        headers: {
          ...originalRequest.headers,
          Authorization: `Bearer ${localStorage.getItem("token")}`, // ✅ fresh token
        },
      });

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve: () => resolve(retryRequest()), reject });
      });
    }

    isRefreshing = true;

    try {
      await _store.dispatch(refreshAccessTokenThunk()).unwrap();
      processQueue(null);
      return retryRequest(); // use helper
    } catch (refreshError) {
      processQueue(refreshError);
      _store.dispatch(logout());
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
