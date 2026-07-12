import { createContext, useContext } from "react";

const ChatSocketContext = createContext(null);

export function ChatSocketProvider({ value, children }) {
  return (
    <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error("useChatSocket must be used within ChatSocketProvider");
  }
  return ctx;
}
