import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import ENDPOINTS from "../api/endpoints";
import LoadingPage from "../../shared/pages/LoadingPage";

const PublicRoutes = () => {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axiosInstance.get(ENDPOINTS.ME.CHECK_ME);
        setIsAuth(true);
      } catch {
        setIsAuth(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuth === null) return <LoadingPage />;

  return isAuth ? <Navigate to="/chat" replace /> : <Outlet />;
};

export default PublicRoutes;