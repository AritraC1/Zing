import { Download, X } from "lucide-react";
import { useEffect } from "react";
import { downloadMedia, mediaFileName } from "../../../shared/utils/downloadMedia";

/**
 * Full-screen media viewer (WhatsApp-style lightbox). Click the
 * backdrop or press Escape to close.
 */
const MediaViewer = ({ url, mimeType, onClose }) => {
  useEffect(() => {
    if (!url) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [url, onClose]);

  if (!url) return null;

  const isImage = mimeType?.startsWith("image/");
  const isVideo = mimeType?.startsWith("video/");

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadMedia(url, { mimeType, filename: mediaFileName(mimeType) });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
      >
        <X size={22} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full flex flex-col items-center gap-3"
      >
        {isImage && (
          <img
            src={url}
            alt="media"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
        )}

        {isVideo && (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-lg"
          />
        )}

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
        >
          <Download size={16} />
          Download
        </button>
      </div>
    </div>
  );
};

export default MediaViewer;
