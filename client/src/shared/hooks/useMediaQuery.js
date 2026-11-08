import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query and re-renders on change.
 * Used to switch between the desktop layout and the mobile AppShell.
 */
export const useMediaQuery = (query) => {
  const subscribe = useCallback(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};
