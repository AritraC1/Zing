import { Send, Plus, X, Smile, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import { useChatSocket } from "../context/ChatSocketContext";
import { uploadMedia } from "../api/chatThunk";

const MessageInput = () => {
  const dispatch = useDispatch();

  const { sendMessage } = useChatSocket();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  // Ref mirror of isSending so the guard also works for events fired
  // before a re-render (double-click, Enter spam) can slip through.
  const isSendingRef = useRef(false);

  const handleMediaClick = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const previewFiles = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...previewFiles]);
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
  };

  const removeFile = (index) => {
    const updated = [...files];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    setFiles(updated);
  };

  const handleSend = async () => {
    if (isSendingRef.current) return;
    if (!message.trim() && files.length === 0) return;

    isSendingRef.current = true;
    setIsSending(true);

    const content = message.trim();
    const items = [...files];

    try {
      const uploadedMedia = [];

      for (const item of items) {
        const media = await dispatch(uploadMedia(item.file)).unwrap();
        uploadedMedia.push({ ...media, previewUrl: item.preview });
      }

      // WhatsApp-style: every selected image/file becomes its own
      // message so nothing gets dropped or silently merged. The typed
      // text acts as a caption on the first message.
      if (uploadedMedia.length === 0) {
        sendMessage({ content, mediaId: null, msgType: "text" });
      } else {
        uploadedMedia.forEach((media, index) => {
          sendMessage({
            content: index === 0 ? content : "",
            mediaId: media.id,
            msgType: "media",
            mimeType: media.mime_type,
            previewUrl: media.previewUrl,
          });
        });
      }

      setMessage("");
      items.forEach((item) => URL.revokeObjectURL(item.preview));
      setFiles([]);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Enable send if there is text or files
  const canSend = (message.trim() || files.length > 0) && !isSending;

  return (
    <div className="bg-white px-4 py-3">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {files.map((item, index) => (
            <div key={`${item.preview}-${index}`} className="relative">
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
                disabled={isSending}
                className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-red-500 text-white flex items-center justify-center disabled:opacity-50"
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
          disabled={isSending}
          className="text-gray-400 hover:text-gray-700 transition-colors flex items-center disabled:opacity-50"
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
          {isSending ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Send size={17} />
          )}
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
};

export default MessageInput;
