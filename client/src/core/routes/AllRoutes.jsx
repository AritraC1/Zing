import { Route, Routes } from "react-router-dom";
import PublicRoutes from "./PublicRoutes";
import AuthPage from "../../features/auth/pages/AuthPage";
import ProtectedRoutes from "./protectedRoutes";
import ChatPage from "../../features/chat/pages/ChatPage";
import AudioCallPage from "../../features/calls/pages/AudioCallPage";
import VideoCallPage from "../../features/calls/pages/VideoCallPage";

const AllRoutes = () => {
  return (
    <Routes>
      {/* Public Route - Auth */}
      <Route element={<PublicRoutes />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      {/* All Protected Routes */}
      <Route element={<ProtectedRoutes />}>
        {/* Chat screen */}
        <Route index element={<ChatPage />} />

        {/* Call screen */}
        <Route path="call" element={<AudioCallPage />} />
        <Route path="video-call" element={<VideoCallPage />} />
      </Route>
    </Routes>
  );
};

export default AllRoutes;
