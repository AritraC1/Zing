import { useState } from "react";
import { useChat } from "../hooks/useChat";
import ChatListItem from "./ChatListItem";
import { Search } from "lucide-react";

const ArchivedChats = () => {
  const { archivedChats } = useChat();
  const [search, setSearch] = useState("");

  const filteredChats = archivedChats.filter((chat) =>
    chat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-80 min-h-screen flex flex-col bg-gray-100 border-r border-gray-300">

      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Archived</h1>
      </div>

      {archivedChats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 px-6 text-center">
          <p className="text-sm">No chats archived yet</p>
        </div>
      ) : (
        <>
          {/* Search Box */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search archived chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-full bg-white text-gray-700 outline-none"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pb-2">
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 px-6 text-center">
                <p className="font-medium">No matching chats</p>
                <p className="text-sm mt-1">Try a different name</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <ChatListItem key={chat.id} chat={chat} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ArchivedChats;