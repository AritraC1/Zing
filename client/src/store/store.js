import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import { persistStore } from "redux-persist";
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { injectStore } from "../core/api/axiosInstance";

export const store = configureStore({
  reducer: rootReducer,

  // Configure middleware to ignore redux-persist action types in serializableCheck
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // These actions include non-serializable values (functions), which would otherwise trigger warnings
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create a persistor linked to the store
// This is responsible for saving and rehydrating the Redux state 
export const persistor = persistStore(store);

// Inject the store into axios setup
injectStore(store);
