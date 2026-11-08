import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

import { io } from "socket.io-client";
import useAuth from "../../features/auth/hooks/useAuth";
import { SocketContext } from "./socketContext";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000");

function log(...args) {
  if (import.meta.env.DEV) {
    console.warn("[socket]", ...args);
  }
}

export function SocketProvider({ children }) {
  const { isAuthenticated, user, accessToken } = useAuth();

  // Live socket instance kept in a ref (so emit/on/off wrappers stay
  // stable) and mirrored into state so the context always reflects the
  // current connection. Without the state mirror, `socket` captured in
  // useMemo would stay undefined/stale and consumers would treat a live
  // connection as offline.
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // --- Create / tear down the connection based on auth state ---
  useEffect(() => {
    const shouldConnect = isAuthenticated && !!user?.id;

    if (!shouldConnect) {
      // Logout / not authenticated: tear down if one exists
      if (socketRef.current) {
        log("disconnecting (logout / unauthenticated)");
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setIsReconnecting(false);
      }
      return;
    }

    // Already have a live instance? Don't create a second one.
    if (socketRef.current) return;

    log("creating socket connection");
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
    });

    socket.on("connect", () => {
      log("connected", socket.id);
      setIsConnected(true);
      setIsReconnecting(false);
    });

    socket.on("disconnect", (reason) => {
      log("disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("reconnect_attempt", () => {
      log("reconnect_attempt");
      setIsReconnecting(true);
    });

    socket.on("reconnect", () => {
      log("reconnected");
      setIsReconnecting(false);
      setIsConnected(true);
    });

    socket.on("reconnect_failed", () => {
      log("reconnect_failed");
      setIsReconnecting(false);
    });

    socket.on("connect_error", (err) => {
      log("connect_error:", err.message);
    });

    socketRef.current = socket;
    setSocket(socket);

    // Provider unmount (app teardown) — safe to fully disconnect here.
    // NOT tied to any child component's lifecycle.
    return () => {
      log("provider unmounting — disconnecting");
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // --- Keep auth token fresh on the existing connection ---
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !accessToken) return;

    if (socket.auth?.token !== accessToken) {
      log("refreshing socket auth token");
      socket.auth.token = accessToken;

      // Token changed while connected: force a reconnect so the
      // server re-authenticates the handshake with the new token.
      if (socket.connected) {
        socket.disconnect();
        socket.connect();
      }
    }
  }, [accessToken]);

  // --- Stable emit/on/off wrappers so consumers don't need socketRef ---
  const emit = useCallback((event, ...args) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      isReconnecting,
      emit,
      on,
      off,
    }),
    [socket, isConnected, isReconnecting, emit, on, off],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
