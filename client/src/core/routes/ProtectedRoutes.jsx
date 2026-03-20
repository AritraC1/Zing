import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import ENDPOINTS from "../api/endpoints";
import LoadingPage from "../../shared/pages/LoadingPage";

const ProtectedRoutes = () => {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
  const timer = setTimeout(() => {
    const checkAuth = async () => {
      try {
        await axiosInstance.get(ENDPOINTS.ME.CHECK_ME);
        setIsAuth(true);
      } catch (err) {
        console.log("Error: ", err);
        setIsAuth(false);
      }
    };

    checkAuth();
  }, 2000); // 2 second delay

  return () => clearTimeout(timer);
}, []);

  if (isAuth === null) return <LoadingPage />;

  return isAuth ? <Outlet /> : <Navigate to="/auth" replace />;
};

export default ProtectedRoutes;