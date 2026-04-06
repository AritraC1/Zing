import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import ENV from "../../core/config/env";
import useAuth from "../../features/auth/hooks/useAuth";

export const useSocket = () => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // prevent multiple sockets
    if (socketRef.current?.connected) return;

    if (isAuthenticated && user?.id) {
      socketRef.current = io(ENV.socketUrl || "http://localhost:3000", {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to socket server");
        setIsConnected(true);
      });

      socketRef.current.on("disconnect", () => {
        console.log("Disconnected from socket server");
        setIsConnected(false);
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id]);

  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  // const getSocket = () => socketRef.current;

  return {
    socket: socketRef.current,
    // getSocket,
    isConnected,
    emit,
    on,
    off,
  };
};
