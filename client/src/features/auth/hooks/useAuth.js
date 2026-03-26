import { useSelector } from "react-redux";

const useAuth = () => {
  const auth = useSelector((state) => state.auth);

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isAuthChecking: auth.isAuthChecking,
    loading: auth.loading,
    error: auth.error,
  };
};

export default useAuth;