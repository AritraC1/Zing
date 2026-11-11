import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AllRoutes from "./core/routes/AllRoutes";
import ErrorBoundary from "./shared/components/ErrorBoundary";
import { CallProvider } from "./features/calls/CallProvider";
import { GroupCallProvider } from "./features/calls/GroupCallProvider";
import ChatGlobalSync from "./features/chat/ChatGlobalSync";

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
          <GroupCallProvider>
            <ChatGlobalSync />
            <AllRoutes />
          </GroupCallProvider>
        </CallProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;
