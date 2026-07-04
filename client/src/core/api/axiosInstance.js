import axios from "axios";
import API_CONFIG from "../config/apiConfig";
import { refreshAccessTokenThunk } from "../../features/auth/api/authThunk";
import { logout } from "../../features/auth/store/authReducer";
import { resetChat } from "../../features/chat/store/chatReducer";
import { persistor } from "../../store/store";

// Store Injection
// We store a reference to Redux store so we can dispatch actions
// inside Axios interceptors (since hooks can't be used here)
let _store;

export const injectStore = (store) => {
  _store = store;
};

// Axios Instance Setup (Creating a custom axios instance with base config)
const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json", // Default content type
  },
});

axiosInstance.interceptors.request.use((config) => {
  if (!_store) return config;

  const token = _store.getState()?.auth?.accessToken;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Token Refresh State Management

let isRefreshing = false; // Flag to prevent multiple refresh calls at the same time
let waitingRequests = []; // Queue to hold requests while token is being refreshed

// Resolve or reject all queued requests after refresh attempt
const resolveQueue = (error) => {
  waitingRequests.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  waitingRequests = [];
};

// Retry original request — no manual token needed, cookie is sent automatically
const retryRequest = (originalRequest) => {
  return axiosInstance(originalRequest);
};

// Response Interceptor (Handles all responses and errors globally)
axiosInstance.interceptors.response.use(
  (response) => response,

  // If error occurs, handle it here
  async (err) => {
    const originalRequest = err.config;

    if (!originalRequest) return Promise.reject(err);
    if (originalRequest.url.includes("/refresh")) return Promise.reject(err);
    if (err.response?.status !== 401) return Promise.reject(err);
    if (!_store) return Promise.reject(new Error("Store not injected"));
    if (originalRequest._retry) return Promise.reject(err);

    // Mark request as retried
    originalRequest._retry = true;

    // If token refresh is already in progress
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        // Add request to queue and resolve later
        waitingRequests.push({
          resolve: () => resolve(retryRequest(originalRequest)),
          reject,
        });
      });
    }

    // Start token refresh
    isRefreshing = true;

    try {
      // Dispatch refresh token API call
      await _store.dispatch(refreshAccessTokenThunk()).unwrap();

      // Resolve all queued requests (retry them)
      resolveQueue(null);

      // Retry the original failed request
      return retryRequest(originalRequest);
    } catch (refreshError) {
      // If refresh fails, reject all queued requests
      resolveQueue(refreshError);

      // Log the user out
      _store.dispatch(logout());
      _store.dispatch(resetChat());
      await persistor.purge();
      return Promise.reject(refreshError);
    } finally {
      // Reset refresh flag
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
