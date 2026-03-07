import { useSelector, useDispatch } from "react-redux";
import { selectChat, setTab, archiveChat, unarchiveChat } from "../store/chatReducer";

export const useChat = () => {
  const dispatch = useDispatch();
  const { chats, archivedChats, selectedChat, tab } = useSelector(
    (state) => state.chat,
  );

  return {
    chats,
    archivedChats,
    selectedChat,
    tab,

    setTab: (t) => dispatch(setTab(t)),
    selectChat: (chat) => dispatch(selectChat(chat)),
    archiveChat: (id) => dispatch(archiveChat(id)),
    unarchiveChat: (id) => dispatch(unarchiveChat(id)),
  };
};
