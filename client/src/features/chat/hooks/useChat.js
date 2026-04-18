import { useSelector, useDispatch } from "react-redux";
import {
  selectChat,
  setTab,
  archiveChat,
  unarchiveChat,
  addMessage,
  setMessages,
  updateMessageStatus,
} from "../store/chatReducer";
import { fetchMyChats } from "../api/chatThunk";
import { useSocket } from "../../../shared/hooks/useSocket";
import useAuth from "../../auth/hooks/useAuth";
import { useEffect } from "react";

export const useChat = () => {
  const dispatch = useDispatch();
  const {
    chats,
    archivedChats,
    selectedChat,
    tab,
    messages: allMessages,
    statuses: allStatuses,
  } = useSelector((state) => state.chat);
  const { emit, isConnected, on, off } = useSocket();
  const { isAuthenticated } = useAuth();

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (message) => {
      if (message && message.id) {
        dispatch(addMessage(message));
        // Emit delivered since we received it
        emit("message_delivered", {
          messageId: message.id,
          conversationId: message.conversation_id,
        });
      }
    };

    const handleMessageSent = (message) => {
      if (message && message.id) {
        dispatch(addMessage(message));
      }
    };

    const handleMessageHistory = (data) => {
      if (data && data.conversationId) {
        const messages = Array.isArray(data.messages) ? data.messages : [];
        const statuses = Array.isArray(data.statuses) ? data.statuses : [];
        dispatch(
          setMessages({
            conversationId: data.conversationId,
            messages,
            statuses,
          }),
        );
      }
    };

    const handleMessageDelivered = (data) => {
      const { messageId, deliveredTo } = data;
      dispatch(
        updateMessageStatus({
          messageId,
          userId: deliveredTo,
          status: "delivered",
        }),
      );
    };

    const handleMessagesRead = (data) => {
      const { messageIds } = data;
      messageIds.forEach((messageId) => {
        dispatch(
          updateMessageStatus({
            messageId,
            userId: selectedChat?.otherUserId,
            status: "seen",
          }),
        );
      });
    };

    on("new_message", handleNewMessage);
    on("message_sent", handleMessageSent);
    on("message_history", handleMessageHistory);
    on("message_delivered", handleMessageDelivered);
    on("messages_read", handleMessagesRead);

    return () => {
      off("new_message", handleNewMessage);
      off("message_sent", handleMessageSent);
      off("message_history", handleMessageHistory);
      off("message_delivered", handleMessageDelivered);
      off("messages_read", handleMessagesRead);
    };
  }, [dispatch, emit, selectedChat?.otherUserId, on, off]);

  // Fetch messages when chat is selected or socket becomes connected
  useEffect(() => {
    if (!selectedChat || !isConnected) return;

    emit("fetch_messages", { conversationId: selectedChat.id });
  }, [selectedChat, isConnected, emit]);

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

  const currentChatMessages = selectedChat
    ? allMessages[selectedChat.id] || []
    : [];
  const currentChatStatuses = selectedChat
    ? allStatuses[selectedChat.id] || []
    : [];

  return {
    chats,
    archivedChats,
    selectedChat,
    tab,
    messages: currentChatMessages,
    statuses: currentChatStatuses,

    setTab: (t) => dispatch(setTab(t)),
    selectChat: (chat) => dispatch(selectChat(chat)),
    archiveChat: (id) => dispatch(archiveChat(id)),
    unarchiveChat: (id) => dispatch(unarchiveChat(id)),
    sendMessage,
    markAsRead,
  };
};
