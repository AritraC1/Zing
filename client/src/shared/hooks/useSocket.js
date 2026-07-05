import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import ENV from "../../core/config/env";
import useAuth from "../../features/auth/hooks/useAuth";

export const useSocket = () => {
  const { user, isAuthenticated, accessToken } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    // prevent multiple sockets
    if (socketRef.current?.connected) {
      return;
    }

    const authConfig = accessToken ? { token: accessToken } : undefined;

    socketRef.current = io(ENV.socketUrl || "http://localhost:3000", {
      transports: ["websocket", "polling"],
      withCredentials: true,
      ...(authConfig ? { auth: authConfig } : {}),
    });

    socketRef.current.on("connect", () => {
      setIsConnected(true);
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, accessToken]);

  const emit = useCallback((event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      if (import.meta.env.DEV) {
        console.log("🟢 Socket emit:", event, data);
      }
      socketRef.current.emit(event, data);
    } else {
      console.error("🔴 Cannot emit - socket not ready", {
        hasSocket: !!socketRef.current,
        connected: socketRef.current?.connected,
        event,
      });
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  return useMemo(
    () => ({
      isConnected,
      emit,
      on,
      off,
    }),
    [isConnected, emit, on, off],
  );
};
