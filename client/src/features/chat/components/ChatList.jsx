import { useState } from "react";
import { useChat } from "../hooks/useChat";
import ChatListItem from "./ChatListItem";
import { MessageSquarePlus, Search } from "lucide-react";
import AddNewChatPopup from "../../users/components/AddNewChatPopup";
import CreateGroupModal from "./CreateGroupModal";
import { useAppShell } from "../../../shared/layout/useAppShell";

const ChatList = () => {
  const { chats, selectedChat, selectChat } = useChat();
  const { openConversation } = useAppShell();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const handleSelect = (chat) => {
    selectChat(chat);
    openConversation();
  };

  const filteredChats = chats.filter((chat) =>
    (chat.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 h-full md:min-h-screen flex flex-col bg-gray-100 md:border-r md:border-gray-300">

      {/* Header */}
      <div className="px-4 md:px-5 pt-4 md:pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>

        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors flex items-center"
        >
          <MessageSquarePlus size={20} />
        </button>
      </div>

      {/* Search Box */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-full bg-white text-gray-700 outline-none"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pb-2">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChat?.id === chat.id}
              onSelect={handleSelect}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 px-6 text-center">
            {search ? (
              <>
                <p className="font-medium">No chats found</p>
                <p className="text-sm mt-1">Try a different name</p>
              </>
            ) : (
              <>
                <p className="font-medium">No chats yet</p>
                <p className="text-sm mt-1">
                  Start a conversation by clicking the + button
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Popup — and the group creation flow it can open. The modal
          lives here (not inside the popup) so closing the popup can't
          unmount it mid-flow. */}
      <AddNewChatPopup
        isOpen={open}
        onClose={() => setOpen(false)}
        onNewGroup={() => {
          setOpen(false);
          setShowGroupModal(true);
        }}
      />

      <CreateGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
      />
    </div>
  );
};

export default ChatList;