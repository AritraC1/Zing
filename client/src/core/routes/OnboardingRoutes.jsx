import { Navigate, Outlet } from "react-router-dom";
import LoadingPage from "../../shared/pages/LoadingPage";
import useAuth from "../../features/auth/hooks/useAuth";

const OnboardingRoutes = () => {
  const { isAuthenticated, isAuthChecking, user } = useAuth();

  if (isAuthChecking) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Only allow users who still need onboarding
  if (user?.isNewUser || !user?.profileCompleted) {
    return <Outlet />;
  }

  // If already onboarded, do not allow onboard page
  return <Navigate to="/chat" replace />;
};

export default OnboardingRoutes;
