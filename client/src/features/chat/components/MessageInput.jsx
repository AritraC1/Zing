import { Send, Plus, Mic } from "lucide-react";

export default function MessageInput() {
  return (
    <div className="p-4 bg-white border-t flex items-center gap-3">

      {/* Add Media */}
      <button className="p-2 rounded-full hover:bg-gray-100 transition text-gray-600">
        <Plus size={20} />
      </button>

      {/* Message Input */}
      <input
        placeholder="Type a message"
        className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* Voice Mic */}
      <button className="p-2 rounded-full hover:bg-gray-100 transition text-gray-600">
        <Mic size={20} />
      </button>

      {/* Send Button */}
      <button className="bg-blue-500 text-white p-3 rounded-full shadow hover:bg-blue-600 transition">
        <Send size={16} />
      </button>

    </div>
  );
}