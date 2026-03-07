import { useChat } from "../hooks/useChat";

export default function Messages() {

  const { selectedChat } = useChat();

  return (
    <div className="flex-1 overflow-y-auto px-10 py-6 space-y-4 bg-[#f8fafc]">
      <div className="flex gap-2">
        <div className="h-7 w-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
          {selectedChat.name.charAt(0)}
        </div>

        <div className="bg-white px-4 py-2 rounded-2xl shadow text-sm max-w-xs">
          Sure, the meeting's at 4pm!
          <div className="text-[10px] text-gray-400 mt-1">4:32 PM</div>
        </div>
      </div>

      <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl ml-auto shadow text-sm max-w-xs">
        Yes! What time works?
        <div className="text-[10px] text-blue-100 mt-1 text-right">
          3:46 PM ✓✓
        </div>
      </div>
    </div>
  );
}