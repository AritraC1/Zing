import { useEffect, useRef } from "react";
import useAuth from "../features/auth/hooks/useAuth";
import generateDeviceDetails from "../shared/utils/generateDeviceDetails";
import * as signalService from "../core/crypto/signalService";

/**
 * Bootstraps the E2EE (Signal protocol) layer once the signed-in user
 * is known: generates/loads this device's key material and registers
 * it with the server. Resets cleanly on logout or account switch.
 */
const useSignalInit = () => {
  const { user } = useAuth();
  const initializedFor = useRef(null);

  useEffect(() => {
    const userId = user?.id;

    // Logged out: drop the crypto context so a different account never
    // reuses this device's previous sessions.
    if (!userId) {
      if (initializedFor.current) {
        signalService.reset();
        initializedFor.current = null;
      }
      return;
    }

    if (initializedFor.current === userId) return;
    initializedFor.current = userId;

    const { deviceId } = generateDeviceDetails();

    signalService
      .init(userId, deviceId)
      .catch((error) => {
        initializedFor.current = null;
        console.error("[useSignalInit] Signal init failed:", error);
      });

    return () => {};
  }, [user?.id]);
};

export default useSignalInit;
