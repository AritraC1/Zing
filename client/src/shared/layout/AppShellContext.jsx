import { createContext } from "react";

const noOp = () => {};

/**
 * Shared context for the mobile/tablet AppShell. Lets feature components
 * (e.g. ChatHeader) know they are inside the mobile shell and drive
 * shell-level behaviour such as opening/closing the conversation pane.
 */
export const AppShellContext = createContext({
  isMobile: false,
  isConversationOpen: false,
  openConversation: noOp,
  closeConversation: noOp,
});
