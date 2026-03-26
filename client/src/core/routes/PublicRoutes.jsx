import { Navigate, Outlet } from "react-router-dom";
import LoadingPage from "../../shared/pages/LoadingPage";
import useAuth from "../../features/auth/hooks/useAuth";

const PublicRoutes = () => {
  const { isAuthenticated, isAuthChecking, user } = useAuth();

  if (isAuthChecking) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    if (user?.isNewUser || !user?.profileCompleted) {
      return <Navigate to="/onboard" replace />;
    }

    return <Navigate to="/chat" replace />;
  }

  return <Outlet />;
};

export default PublicRoutes;
