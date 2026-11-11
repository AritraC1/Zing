import { useContext } from "react";
import { GroupCallContext } from "../groupCallContext";

export function useGroupCall() {
  const ctx = useContext(GroupCallContext);
  if (!ctx) {
    throw new Error("useGroupCall must be used within a GroupCallProvider");
  }
  return ctx;
}
