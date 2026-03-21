import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import ENDPOINTS from "../api/endpoints";
import LoadingPage from "../../shared/pages/LoadingPage";

const ProtectedRoutes = () => {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axiosInstance.get(ENDPOINTS.ME.CHECK_ME);
        setIsAuth(true);
      } catch (err) {
        // Only set false if refresh also failed (interceptor handles refresh)
        console.log("Error: ", err);
        setIsAuth(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuth === null) return <LoadingPage />;

  return isAuth ? <Outlet /> : <Navigate to="/auth" replace />;
};

export default ProtectedRoutes;
