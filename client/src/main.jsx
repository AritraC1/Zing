import "./index.css";
import App from "./App.jsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/store.js";
import AppInitializer from "./app/AppInitializer.jsx";

createRoot(document.getElementById("root")).render(
  // <StrictMode></StrictMode>,
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <AppInitializer>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppInitializer>
    </PersistGate>
  </Provider>,
);
