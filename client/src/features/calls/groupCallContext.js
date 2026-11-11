import { createContext } from "react";

// GroupCallContext — shared state for SFU-backed group calls (up to 5
// participants via mediasoup). Provided by GroupCallProvider.
export const GroupCallContext = createContext(null);
