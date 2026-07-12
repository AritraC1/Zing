import { useContext } from "react";
import { SocketContext } from "./SocketProvider";

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return ctx;
}