import { useState } from "react";
import { Settings } from "lucide-react";
import SettingsDialog from "../../features/profile/components/SettingsDialog";

/**
 * Easing used across the shell — a spring-like curve that feels
 * app-like without needing framer-motion.
 */
export const SHELL_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const EASE_CLASS = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/**
 * Bottom tab bar. Icons/labels use the project palette:
 * dark chrome `#0d1117` with the `#00c896` accent for the active tab.
 * The highlight pill slides between tabs instead of jumping.
 */
const BottomNav = ({ items, visible }) => {
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.active),
  );

  return (
    <nav
      className={`relative z-20 shrink-0 overflow-hidden bg-[#0d1117] border-t border-white/10
        transition-[height] duration-300 ${EASE_CLASS}
        ${visible ? "h-[calc(3.75rem+env(safe-area-inset-bottom))]" : "h-0 pointer-events-none"}`}
      aria-hidden={!visible}
    >
      <div
        className="relative h-full"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Sliding active indicator */}
        <div
          className="absolute top-0 bottom-0 transition-transform duration-300 will-change-transform"
          style={{
            width: `${100 / Math.max(items.length, 1)}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transitionTimingFunction: SHELL_EASE,
          }}
        >
          <div className="absolute inset-x-3 top-1.5 bottom-1 rounded-xl bg-[#00c896]/15" />
        </div>

        <div className="relative flex h-full">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1
                  transition-colors duration-150 touch-manipulation select-none
                  active:scale-95 will-change-transform
                  ${item.active ? "text-[#00c896]" : "text-gray-500 active:text-gray-300"}`}
              >
                <span className="relative">
                  <Icon size={21} strokeWidth={item.active ? 2.3 : 1.8} />
                  {item.badge > 0 && !item.active && (
                    <span
                      className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full
                        bg-[#00c896] text-white text-[9px] font-bold leading-[15px] text-center
                        border-2 border-[#0d1117] box-content"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

/**
 * AppShell — the mobile/tablet frame of the actual app (not the landing page).
 *
 * Dark app bar up top (logo + settings), a content surface in the middle and a
 * bottom tab bar, matching the desktop `IconSidebar` palette (`#0d1117` chrome,
 * `#00c896` accent). `hideChrome` collapses both bars with a transition — used
 * when the conversation pane slides fully over the shell.
 */
const AppShell = ({ nav = [], hideChrome = false, children }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative flex h-dvh flex-col bg-gray-100 overflow-hidden">
      {/* Top app bar */}
      <header
        className={`relative z-20 shrink-0 overflow-hidden bg-[#0d1117]
          transition-[height] duration-300 ${EASE_CLASS}
          ${hideChrome ? "h-0" : "h-14"}`}
      >
        <div
          className="flex h-14 items-center justify-between px-4"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00c896] flex items-center justify-center">
              <span className="text-white font-bold text-sm leading-none">
                Z
              </span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Zing
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-400 active:scale-90
              transition touch-manipulation"
            aria-label="Open settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Content surface */}
      <main className="relative flex-1 min-h-0 overflow-hidden">{children}</main>

      {/* Bottom tab bar */}
      <BottomNav items={nav} visible={!hideChrome} />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default AppShell;
