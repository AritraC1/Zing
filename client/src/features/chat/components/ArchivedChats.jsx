import { useState } from "react";
import { useChat } from "../hooks/useChat";
import ChatListItem from "./ChatListItem";

const ArchivedChats = () => {
  const { archivedChats } = useChat();
  const [search, setSearch] = useState("");

  const filteredChats = archivedChats.filter((chat) =>
    chat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-r flex flex-col">
      <div className="px-5 pt-4 pb-3">
        <h1 className="font-semibold text-2xl">Archived</h1>
      </div>

      {archivedChats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">No chats archived yet</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="px-4 pb-4">
            <input
              type="text"
              placeholder="Search archived chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg outline-none"
            />
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="text-gray-400 text-sm text-center mt-4">
                No matching archived chats
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