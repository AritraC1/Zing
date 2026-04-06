import { useSelector, useDispatch } from "react-redux";
import {
  selectChat,
  setTab,
  archiveChat,
  unarchiveChat,
  addMessage,
  setMessages,
} from "../store/chatReducer";
import { useSocket } from "../../../shared/hooks/useSocket";
import { useEffect } from "react";

export const useChat = () => {
  const dispatch = useDispatch();
  const { chats, archivedChats, selectedChat, tab, messages: allMessages } = useSelector(
    (state) => state.chat,
  );
  const { socket, emit, on, off } = useSocket();

  // Listen for new messages
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        dispatch(addMessage(message));
      };

      const handleMessageHistory = (data) => {
        dispatch(setMessages({ conversationId: data.conversationId, messages: data.messages }));
      };

      on("new_message", handleNewMessage);
      on("message_history", handleMessageHistory);

      return () => {
        off("new_message", handleNewMessage);
        off("message_history", handleMessageHistory);
      };
    }
  }, [socket, dispatch, on, off]);

  // Fetch messages when chat is selected
  useEffect(() => {
    if (selectedChat && socket) {
      emit("fetch_messages", { conversationId: selectedChat.id });
    }
  }, [selectedChat, socket, emit]);

  const sendMessage = (content) => {
    if (selectedChat && content.trim()) {
      emit("send_message", {
        conversationId: selectedChat.id,
        content: content.trim(),
      });
    }
  };

  const markAsRead = () => {
    if (selectedChat) {
      emit("mark_read", { conversationId: selectedChat.id });
    }
  };

  const currentChatMessages = selectedChat ? allMessages[selectedChat.id] || [] : [];

  return {
    chats,
    archivedChats,
    selectedChat,
    tab,
    messages: currentChatMessages,

    setTab: (t) => dispatch(setTab(t)),
    selectChat: (chat) => dispatch(selectChat(chat)),
    archiveChat: (id) => dispatch(archiveChat(id)),
    unarchiveChat: (id) => dispatch(unarchiveChat(id)),
    sendMessage,
    markAsRead,
  };
};
