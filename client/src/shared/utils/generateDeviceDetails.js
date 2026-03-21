import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "deviceId";
const isBrowser = typeof window !== "undefined";

// Safely get browser info
const getBrowserInfo = () => {
  if (!isBrowser) return {};

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || "unknown",
    language: navigator.language,
  };
};

const generateDeviceDetails = () => {
  if (!isBrowser) {
    return {
      deviceId: null,
      deviceType: "web",
      metadata: {},
    };
  }

  let deviceId;

  try {
    deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  } catch (error) {
    console.error("Error: ", error);
    deviceId = uuidv4(); // fallback if localStorage fails
  }

  return {
    deviceId,
    deviceType: "web",
    metadata: getBrowserInfo(),
  };
};

export default generateDeviceDetails;
