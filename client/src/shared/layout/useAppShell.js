import { useContext } from "react";
import { AppShellContext } from "./AppShellContext";

export const useAppShell = () => useContext(AppShellContext);
