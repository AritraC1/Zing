import { Route, Routes } from "react-router-dom";

import PublicRoutes from "./PublicRoutes";
import LandingPage from "../../features/landing/pages/LandingPage";
import AuthPage from "../../features/auth/pages/AuthPage";

import OnboardingRoutes from "./OnboardingRoutes";
import ProfileSetupPage from "../../features/profile/pages/ProfileSetupPage";

import ProtectedRoutes from "./ProtectedRoutes";
import ChatPage from "../../features/chat/pages/ChatPage";
import AudioCallPage from "../../features/calls/pages/AudioCallPage";
import VideoCallPage from "../../features/calls/pages/VideoCallPage";

const AllRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicRoutes />}>
        <Route index element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      {/* Onboarding Routes */}
      <Route element={<OnboardingRoutes />}>
        <Route path="/onboard" element={<ProfileSetupPage />} />
      </Route>

      {/* Fully Protected Routes */}
      <Route element={<ProtectedRoutes />}>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/call" element={<AudioCallPage />} />
        <Route path="/video-call" element={<VideoCallPage />} />
      </Route>
    </Routes>
  );
};

export default AllRoutes;
