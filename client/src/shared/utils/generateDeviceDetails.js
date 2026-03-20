import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "deviceId";

const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;

  return {
    userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
};

const generateDeviceDetails = () => {
  // Device Id
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  // DeviceType - always web
  return {
    deviceId,
    deviceType: "web",
    metadata: getBrowserInfo(),
  };
};

export default generateDeviceDetails;
