import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AllRoutes from "./core/routes/AllRoutes";
import ErrorBoundary from "./shared/components/ErrorBoundary";

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
        <AllRoutes />
      </ErrorBoundary>
    </>
  );
}

export default App;
