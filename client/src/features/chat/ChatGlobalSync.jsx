import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSocketContext } from "../../core/socket/useSocketContext";
import useAuth from "../auth/hooks/useAuth";
import { fetchMyChats } from "./api/chatThunk";
import { renameChat, removeChat } from "./store/chatReducer";

/**
 * App-wide listener for `group:update`.
 *
 * Lives outside ChatPage (mounted next to the call providers in App.jsx)
 * so group events are applied no matter which route the user is on.
 * ChatPage's own socket sync unmounts on navigation, which used to drop
 * these events and leave the chat list stale until a manual refresh.
 */
const ChatGlobalSync = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!isAuthenticated || !socket) return undefined;

    // Group membership / metadata changed anywhere: created, renamed,
    // members added/removed, someone left, or the group was deleted.
    // Refetching the conversation list covers every case in one shot;
    // removals are applied locally too so the group disappears even if
    // the refetch momentarily lags.
    const handleGroupUpdate = (data) => {
      const { conversationId, action, name } = data || {};
      if (!conversationId) return;

      if (action === "renamed" && name) {
        dispatch(renameChat({ conversationId, name }));
      }

      if (action === "member-left" || action === "deleted") {
        // The server told *us* specifically that we're out of the group.
        dispatch(removeChat(conversationId));
      }

      dispatch(fetchMyChats());
    };

    socket.on("group:update", handleGroupUpdate);
    return () => socket.off("group:update", handleGroupUpdate);
  }, [socket, isAuthenticated, dispatch]);

  return null;
};

export default ChatGlobalSync;
