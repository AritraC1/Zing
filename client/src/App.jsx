import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AllRoutes from "./core/routes/AllRoutes";
import ErrorBoundary from "./shared/components/ErrorBoundary";
import { CallProvider } from "./features/calls/CallProvider";

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        pauseOnHover
        theme="light"
      />

      <ErrorBoundary>
        <CallProvider>
          <AllRoutes />
        </CallProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;
