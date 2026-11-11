import { Send, Plus, X, Smile, Loader2, Pencil, Reply } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import { useChatSocket } from "../context/ChatSocketContext";
import { useChat } from "../hooks/useChat";
import { uploadMedia } from "../api/chatThunk";
import EmojiPicker from "./EmojiPicker";

const MessageInput = () => {
  const dispatch = useDispatch();

  const { selectedChat, isChatBlocked, unblockUser } = useChat();
  const {
    sendMessage,
    sendTyping,
    editingMessage: rawEditingMessage,
    cancelEdit,
    submitEdit,
    replyToMessage: rawReplyToMessage,
    cancelReply,
  } = useChatSocket();

  // An edit/reply session belongs to one conversation — ignore stale
  // state after switching chats (the hook doesn't null it on switch).
  const editingMessage =
    rawEditingMessage &&
    rawEditingMessage.conversation_id === selectedChat?.id
      ? rawEditingMessage
      : null;
  const replyToMessage =
    rawReplyToMessage &&
    rawReplyToMessage.conversation_id === selectedChat?.id
      ? rawReplyToMessage
      : null;
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const smileButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Ref mirror of isSending so the guard also works for events fired
  // before a re-render (double-click, Enter spam) can slip through.
  const isSendingRef = useRef(false);

  // Typing-indicator state: emit "typing" on the first keystroke and
  // a stop event after a short idle window.
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef(null);

  const stopTyping = () => {
    clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping?.(false);
    }
  };

  const handleTyping = (value) => {
    if (!sendTyping) return;

    if (!isTypingRef.current && value.trim()) {
      isTypingRef.current = true;
      sendTyping(true);
    }

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping?.(false);
    }, 2500);
  };

  // Safety net for the idle timer above: also stop when switching
  // chats or leaving the composer entirely.
  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTyping?.(false);
      }
    };
  }, [sendTyping]);

  // Close the emoji picker on outside taps (mousedown covers click and
  // touch on mobile; the smile button itself is excluded so toggling works).
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleOutside = (e) => {
      const picker = emojiPickerRef.current;
      const smile = smileButtonRef.current;
      if (
        (picker && picker.contains(e.target)) ||
        (smile && smile.contains(e.target))
      ) {
        return;
      }
      setShowEmojiPicker(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showEmojiPicker]);

  // Prefill the composer with the message being edited and focus it.
  useEffect(() => {
    if (editingMessage?.content != null) {
      setMessage(editingMessage.content || "");
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  // Insert at the cursor position if the input is focused, else append.
  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    const caret = el ? el.selectionStart : null;
    setMessage((prev) => {
      if (caret === null) return prev + emoji;
      return prev.slice(0, caret) + emoji + prev.slice(el.selectionEnd ?? caret);
    });
    // Keep focus in the text field so the user can keep typing.
    requestAnimationFrame(() => {
      el?.focus();
      if (el && caret !== null) {
        const next = caret + emoji.length;
        el.setSelectionRange(next, next);
      }
    });
  };

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

    // Editing an existing message: no media flow involved.
    if (editingMessage) {
      const content = message.trim();
      if (!content) return;
      submitEdit(content);
      setMessage("");
      return;
    }

    if (!message.trim() && files.length === 0) return;

    isSendingRef.current = true;
    setIsSending(true);
    stopTyping();

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

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    // Editing doesn't broadcast typing — the peer isn't expecting a
    // new message, just a modified one.
    if (!editingMessage) {
      handleTyping(value);
    }
  };

  // Enable send if there is text or files
  const canSend =
    (message.trim() || files.length > 0) && !isSending && !isChatBlocked;

  // Blocked contact: sending is disabled with an explicit, actionable
  // message instead of a silent failure on the server.
  if (isChatBlocked) {
    return (
      <div className="bg-gray-100 px-4 py-5 shrink-0 text-center border-t border-gray-200">
        <p className="text-sm text-gray-500">
          You blocked this contact. Unblock them from their profile to send
          messages.
        </p>
        <button
          type="button"
          onClick={() => selectedChat?.otherUserId && unblockUser(selectedChat.otherUserId)}
          className="mt-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          Unblock
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-white px-3 sm:px-4 py-3 shrink-0">
      {/* Reply banner (quoted message above the composer) */}
      {replyToMessage && !editingMessage && (
        <div className="flex items-center justify-between gap-3 bg-gray-50 border-b border-gray-200 px-3 py-2 -mx-3 sm:-mx-4 mb-2">
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <Reply size={14} className="text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-emerald-600">
                {replyToMessage.sender_id === selectedChat?.otherUserId
                  ? selectedChat?.name || "Them"
                  : "You"}
              </div>
              <div className="text-gray-500 truncate text-xs">
                {replyToMessage.is_deleted
                  ? "This message was deleted"
                  : replyToMessage.content?.trim() ||
                    (replyToMessage.msg_type === "media"
                      ? "📷 Photo"
                      : "")}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelReply}
            aria-label="Cancel reply"
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {/* Edit banner (replaces the composer in edit mode) */}
      {editingMessage && (
        <div className="flex items-center justify-between gap-3 bg-emerald-50 border-b border-emerald-100 px-3 py-2 -mx-3 sm:-mx-4 mb-2">
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <Pencil size={14} className="text-emerald-600 shrink-0" />
            <span className="text-emerald-700 font-medium shrink-0">
              Editing
            </span>
            <span className="text-gray-500 truncate">
              {editingMessage.content || ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              cancelEdit();
              setMessage("");
            }}
            aria-label="Cancel edit"
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {/* Emoji picker (floats above the input bar) */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-3 right-3 sm:left-2 sm:right-2 mb-2 z-40"
        >
          <EmojiPicker onSelect={insertEmoji} />
        </div>
      )}
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
          ref={inputRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          placeholder={editingMessage ? "Edit your message..." : "Write a message..."}
          className="flex-1 bg-transparent outline-none text-sm text-gray-700 py-1"
        />

        {/* Emoji */}
        <button
          ref={smileButtonRef}
          onClick={() => setShowEmojiPicker((v) => !v)}
          aria-label="Insert emoji"
          className={`transition-colors p-1 rounded-full ${
            showEmojiPicker
              ? "text-emerald-500 bg-emerald-50"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
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
