import { useSelector, useDispatch } from "react-redux";
import { selectChat, setTab } from "../store/chatReducer";

export const useChat = () => {
  const dispatch = useDispatch();
  const { chats, selectedChat, tab } = useSelector((state) => state.chat);

  return {
    chats,
    selectedChat,
    tab,
    setTab: (t) => dispatch(setTab(t)),
    selectChat: (chat) => dispatch(selectChat(chat)),
  };
};