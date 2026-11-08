import { useRef } from "react";

/**
 * SlideOverPane — a full-height pane that slides over the shell from the
 * right (used for the conversation view on mobile/tablet).
 *
 * Behaviour:
 *  - mounted content stays alive while closed, so navigating between list
 *    and conversation is instant and state is preserved
 *  - supports an iOS-style edge-swipe-back gesture (drag from the left edge
 *    to dismiss, with live finger tracking and velocity release)
 *
 * `open` is fully controlled by the parent.
 */
const OPEN_MS = 240;

const SlideOverPane = ({ open, onClose, children }) => {
  const paneRef = useRef(null);
  const gesture = useRef({
    tracking: false,
    dragging: false,
    startX: 0,
    startY: 0,
    dx: 0,
  });

  const resetGesture = () => {
    gesture.current = { tracking: false, dragging: false, startX: 0, startY: 0, dx: 0 };
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    // Only arm near the left edge so vertical scrolling is never hijacked.
    gesture.current = {
      tracking: touch.clientX <= 36,
      dragging: false,
      startX: touch.clientX,
      startY: touch.clientY,
      dx: 0,
    };
  };

  const handleTouchMove = (e) => {
    const state = gesture.current;
    if (!state.tracking) return;

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    if (!state.dragging) {
      if (dx > 12 && Math.abs(dy) < 12) {
        // Commit to horizontal drag — lock in.
        state.dragging = true;
        const el = paneRef.current;
        if (el) el.style.transition = "none";
      } else if (Math.abs(dy) >= 12 || dx < -12) {
        state.tracking = false; // vertical scroll wins
        return;
      } else {
        return;
      }
    }

    state.dx = Math.max(0, dx);
    const el = paneRef.current;
    if (el) el.style.transform = `translateX(${state.dx}px)`;
  };

  const handleTouchEnd = () => {
    const state = gesture.current;
    if (!state.dragging) {
      resetGesture();
      return;
    }

    const el = paneRef.current;
    const dismiss = state.dx > el.clientWidth * 0.35;

    state.dragging = false;

    if (el) {
      el.style.transition = `transform ${OPEN_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
      el.style.transform = dismiss ? `translateX(${el.clientWidth}px)` : "translateX(0px)";

      window.setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
        if (dismiss) onClose();
        resetGesture();
      }, OPEN_MS);
    } else {
      if (dismiss) onClose();
      resetGesture();
    }
  };

  return (
    <div
      ref={paneRef}
      className={`absolute inset-0 z-10 flex flex-col bg-gray-100 transform-gpu will-change-transform
        transition-transform duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]
        ${open ? "translate-x-0" : "translate-x-full"}
        ${open ? "shadow-[-8px_0_28px_rgba(13,17,23,0.18)]" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </div>
  );
};

export default SlideOverPane;
