import { Send, Plus, Mic, X } from "lucide-react";
import { useRef, useState } from "react";
import { useChat } from "../hooks/useChat";

const MessageInput = () => {
  const { sendMessage } = useChat();

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);

  const fileInputRef = useRef(null);

  // Open file picker
  const handleMediaClick = () => {
    fileInputRef.current.click();
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    const previewFiles = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...previewFiles]);
  };

  // Remove file
  const removeFile = (index) => {
    const updated = [...files];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    setFiles(updated);
  };

  // Upload files (placeholder for future implementation)
  // const uploadFiles = async () => {
  //   if (!files.length) return null;
  //   const formData = new FormData();
  //   files.forEach((item) => {
  //     formData.append("files", item.file);
  //   });
  //   try {
  //     const res = await fetch("/api/upload", {
  //       method: "POST",
  //       body: formData,
  //     });
  //     const data = await res.json();
  //     return data; // return uploaded file URLs
  //   } catch (err) {
  //     console.error("Upload failed", err);
  //     return null;
  //   }
  // };

  // Send message (text only for now)
  const handleSend = () => {
    if (!message.trim()) return;

    // Send message
    sendMessage(message);

    // Reset
    setMessage("");
  };

  // Enter to send
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Preview */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {files.map((item, index) => (
            <div key={index} className="relative">
              <img
                src={item.preview}
                className="w-16 h-16 object-cover rounded"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* File button */}
        <button onClick={handleMediaClick}>
          <Plus size={20} />
        </button>

        {/* Input */}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 border rounded-full px-4 py-2"
        />

        {/* Send */}
        <button 
          onClick={handleSend}
          disabled={!message.trim()}
          className={`p-2 rounded-full ${
            message.trim() 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Send size={20} />
        </button>
      </div>

      {/* Hidden file input */}
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
