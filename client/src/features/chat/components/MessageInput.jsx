import { Send, Plus, X, Smile } from "lucide-react";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";

import { useChatSocket } from "../context/ChatSocketContext";
import { uploadMedia } from "../api/chatThunk";

const MessageInput = () => {
  const dispatch = useDispatch();

  const { sendMessage } = useChatSocket();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleMediaClick = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const previewFiles = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...previewFiles]);
  };

  const removeFile = (index) => {
    const updated = [...files];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    setFiles(updated);
  };


  const handleSend = async () => {
    if (!message.trim() && files.length === 0) return;

    try {
      const uploadedMedia = [];

      for (const item of files) {
        const media = await dispatch(uploadMedia(item.file)).unwrap();
        uploadedMedia.push(media);
      }

      // Allow sending file-only messages (no text required)
      sendMessage({
        content: message,
        mediaId: uploadedMedia[0]?.id || null,
        msgType: uploadedMedia.length > 0 ? "media" : "text",
      });

      setMessage("");
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Enable send if there is text or files
  const canSend = message.trim() || files.length > 0;

  return (
    <div className="bg-white px-4 py-3">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {files.map((item, index) => (
            <div key={index} className="relative">
              {item.file.type.startsWith("image/") ? (
                <img
                  src={item.preview}
                  className="w-14 h-14 object-cover rounded-lg"
                  alt="preview"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] text-gray-600">
                  FILE
                </div>
              )}

              <button
                onClick={() => removeFile(index)}
                className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-red-500 text-white flex items-center justify-center"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-center gap-2 bg-gray-50 rounded-full border border-gray-200 px-3 py-1.5">
        {/* Plus */}
        <button
          onClick={handleMediaClick}
          className="text-gray-400 hover:text-gray-700 transition-colors flex items-center"
        >
          <Plus size={20} />
        </button>

        {/* Input */}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Write a message..."
          className="flex-1 bg-transparent outline-none text-sm text-gray-700 py-1"
        />

        {/* Emoji */}
        <button className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full">
          <Smile size={22} />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all
            ${
              canSend
                ? "bg-emerald-500 hover:bg-emerald-600 active:scale-95 cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
            }`}
        >
          <Send size={17} />
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default MessageInput;
