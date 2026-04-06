import { useSelector, useDispatch } from "react-redux";
import {
  selectChat,
  setTab,
  archiveChat,
  unarchiveChat,
  addMessage,
  setMessages,
} from "../store/chatReducer";
import { fetchMyChats } from "../api/chatThunk";
import { useSocket } from "../../../shared/hooks/useSocket";
import useAuth from "../../auth/hooks/useAuth";
import { useEffect } from "react";

export const useChat = () => {
  const dispatch = useDispatch();
  const { chats, archivedChats, selectedChat, tab, messages: allMessages } = useSelector(
    (state) => state.chat,
  );
  const { socket, emit,isConnected } = useSocket();
  const { isAuthenticated } = useAuth();

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message && message.id) {
        dispatch(addMessage(message));
      }
    };

    const handleMessageSent = (message) => {
      if (message && message.id) {
        dispatch(addMessage(message));
      }
    };

    const handleMessageHistory = (data) => {
      if (data && data.conversationId) {
        console.log('📜 Message history loaded:', data.messages?.length, 'messages');
        const messages = Array.isArray(data.messages) ? data.messages : [];
        dispatch(setMessages({ conversationId: data.conversationId, messages }));
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("message_history", handleMessageHistory);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("message_history", handleMessageHistory);
    };
  }, [socket, dispatch]);

  // Fetch messages when chat is selected or socket becomes connected
  useEffect(() => {
    if (!selectedChat || !socket || !isConnected) return;

    emit("fetch_messages", { conversationId: selectedChat.id });
  }, [selectedChat, socket, isConnected, emit]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyChats());
    }
  }, [dispatch, isAuthenticated]);

  const sendMessage = (content) => {
    if (!selectedChat) {
      return;
    }
    if (!content || !content.trim()) {
      return;
    }
    
    emit("send_message", {
      conversationId: selectedChat.id,
      content: content.trim(),
    });
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
