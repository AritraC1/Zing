import { useState } from "react";
import { useChat } from "../hooks/useChat";
import ChatListItem from "./ChatListItem";
import { MessageSquarePlus } from "lucide-react";
import AddNewChatPopup from "../../users/components/AddNewChatPopup";

const ChatList = () => {
  const { chats } = useChat();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-80 bg-white border-r flex flex-col">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h1 className="font-semibold text-2xl">Zing</h1>

        <button
          className="p-2 rounded-lg hover:bg-gray-100 transition"
          onClick={() => setOpen(true)}
        >
          <MessageSquarePlus size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Search Box */}
      <div className="px-4 pb-4">
        <input
          type="text"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6 text-center">
            {search ? (
              <>
                <p className="font-medium">No chats found</p>
                <p className="text-sm">Try a different name</p>
              </>
            ) : (
              <>
                <p className="font-medium">No chats yet</p>
                <p className="text-sm">
                  Start a conversation by clicking the + button
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <AddNewChatPopup isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default ChatList;
