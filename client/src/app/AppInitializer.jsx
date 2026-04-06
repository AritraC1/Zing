import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getMyDetailsThunk } from "../features/profile/api/profileThunk";
import { useSocket } from "../shared/hooks/useSocket";

const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const { socket, _ } = useSocket();

  useEffect(() => {
    dispatch(getMyDetailsThunk());
  }, [dispatch]);

  // You can expose socket globally or use context if needed
  useEffect(() => {
    if (socket) {
      window.socket = socket; // Optional: make socket globally available
    }
  }, [socket]);

  return children;
};

export default AppInitializer;