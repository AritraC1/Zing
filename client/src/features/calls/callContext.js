import { createContext } from "react";

// CallContext — shared state for the 1:1 WebRTC call feature.
// Provided by CallProvider (features/calls/CallProvider.jsx).
export const CallContext = createContext(null);
