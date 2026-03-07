import { Send, Plus, Mic, X } from "lucide-react";
import { useRef, useState } from "react";

const MessageInput = () => {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);

  const handleMediaClick = () => {
    fileInputRef.current.click();
  };

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

  const handleUpload = async () => {
    if (!files.length) return;

    const formData = new FormData();

    files.forEach((item) => {
      formData.append("files", item.file);
    });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Uploaded:", data);

      setFiles([]);
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  return (
    <div className="border-t bg-white p-5">
      {/* Preview Section */}
      {files.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto">
          {files.map((item, index) => (
            <div className="relative w-20 h-20">
              <img
                src={item.preview}
                className="w-full h-full object-cover rounded-lg"
              />

              <button
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-black text-white rounded-full p-1"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Hidden File Input */}
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Media Button */}
        <button
          onClick={handleMediaClick}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
        >
          <Plus size={20} />
        </button>

        {/* Message Input */}
        <input
          placeholder="Type a message"
          className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Mic */}
        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
          <Mic size={20} />
        </button>

        {/* Send */}
        <button
          onClick={handleUpload}
          className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
