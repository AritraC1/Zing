import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import OtpInput from "react-otp-input";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import Step from "../components/Step";
import ENV from "../../../core/config/env";
import {
  setLoginMode,
  setPhone,
  setOtp,
  setShowOtp,
} from "../store/authReducer";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../../core/config/firebaseConfig";
import { verifyOtpThunk } from "../api/authThunk";
import generateDeviceDetails from "../../../shared/utils/generateDeviceDetails";
import { getMyDetailsThunk } from "../../profile/api/profileThunk";

const AuthPage = () => {
  const qrValue = ENV.qrValue;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loginMode, showOtp, phone, otp } = useSelector((state) => state.auth);

  const [timer, setTimer] = useState(30);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);

  // State to store the Firebase confirmation session
  const [confirmationResult, setConfirmationResult] = useState(null);

  // OTP Timer
  useEffect(() => {
    let interval;

    if (showOtp && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [showOtp, timer]);

  // RECAPTCHA Init
  const setupRecaptcha = (containerId) => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
      });
    }
  };

  // Verify Phone and Send SMS
  const handleVerifyPhone = async () => {
    if (!isValidPhoneNumber(phone)) {
      toast.error("Invalid phone number");
      return;
    }

    try {
      setLoadingVerify(true);

      setupRecaptcha("recaptcha-container");
      const appVerifier = window.recaptchaVerifier;

      const confirmation = await signInWithPhoneNumber(
        auth,
        phone,
        appVerifier,
      );
      setConfirmationResult(confirmation);

      dispatch(setShowOtp(true));
      setTimer(30);
      toast.success("OTP sent successfully");
    } catch (error) {
      console.error("SMS Error:", error);
      toast.error("Failed to send SMS. Please check your connection.");

      // Reset reCAPTCHA if it fails so it can be retried
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoadingVerify(false);
    }
  };

  // Submit OTP
  const handleSubmitOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter complete OTP");
      return;
    }

    if (!confirmationResult) {
      toast.error("Session expired. Please request a new OTP.");
      return;
    }

    try {
      setLoadingOtp(true);

      const result = await confirmationResult.confirm(otp);
      const firebaseIdToken = await result.user.getIdToken();

      const { deviceId, deviceType } = generateDeviceDetails();

      const res = await dispatch(
        verifyOtpThunk({
          idToken: firebaseIdToken,
          deviceId,
          deviceType,
        }),
      ).unwrap();

      const { isNewUser, profileCompleted } = res;

      toast.success("OTP verified");

      if (isNewUser || !profileCompleted) {
        navigate("/onboard");
      } else {
        await dispatch(getMyDetailsThunk());
        navigate("/chat");
      }
    } catch (error) {
      console.error(error);
      toast.error(error || "Invalid or expired OTP");
    } finally {
      setLoadingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = () => {
    dispatch(setOtp(""));
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    handleVerifyPhone();
  };

  // Loading Dots
  const LoadingDots = () => (
    <div className="flex items-center justify-center gap-1">
      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl flex flex-col md:flex-row w-full max-w-6xl overflow-hidden">
          {/* LEFT SIDE */}
          <div className="flex-1 p-10 lg:p-12">
            <h1 className="text-3xl font-semibold text-gray-900">
              Log in to Zing Web
            </h1>
            <p className="text-gray-500 mt-2 mb-10">
              Use your phone to securely log into your account.
            </p>
            <div className="space-y-7">
              <Step number="1" text="Open the Zing app on your phone" />
              <Step
                number="2"
                text={
                  <>
                    Tap{" "}
                    <span className="font-medium text-gray-900">Profile</span>
                  </>
                }
              />
              <Step
                number="3"
                text={
                  <>
                    Go to{" "}
                    <span className="font-medium text-gray-900">
                      Linked Devices
                    </span>
                  </>
                }
              />
              <Step
                number="4"
                text={
                  loginMode === "qr"
                    ? "Scan the QR code on this screen"
                    : "Enter the verification code sent to your phone"
                }
              />
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="w-full md:w-105 bg-gray-50 flex flex-col items-center justify-center p-10 border-l relative">
            {/* INVISIBLE RECAPTCHA CONTAINER */}
            <div id="recaptcha-container"></div>

            {/* QR LOGIN */}
            {loginMode === "qr" && (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-md border">
                  <QRCodeCanvas value={qrValue} size={240} />
                </div>
                <p className="mt-6 text-sm text-gray-500 text-center">
                  Scan with your mobile app
                </p>
                <button
                  onClick={() => {
                    dispatch(setLoginMode("phone"));
                    dispatch(setShowOtp(false));
                    dispatch(setOtp(""));
                    dispatch(setPhone(""));
                  }}
                  className="mt-6 text-blue-600 font-medium hover:underline cursor-pointer"
                >
                  Log in with phone number →
                </button>
              </>
            )}

            {/* PHONE LOGIN */}
            {loginMode === "phone" && (
              <div className="w-full max-w-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Log in with phone number
                </h2>

                <PhoneInput
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  value={phone}
                  onChange={(value) => dispatch(setPhone(value))}
                  placeholder="Enter phone number"
                  disabled={showOtp}
                  className="
                    mt-3 flex items-center border border-gray-300 rounded-lg px-3 py-2
                    [&_.PhoneInputCountryCode]:pr-3
                    [&_.PhoneInputCountryCode]:mr-3
                    [&_.PhoneInputCountryCode]:border-r
                    [&_.PhoneInputCountryCode]:border-gray-300
                    [&>input]:w-full
                    [&>input]:outline-none
                    disabled:opacity-60
                    disabled:bg-gray-100
                  "
                />

                {!showOtp && (
                  <button
                    onClick={handleVerifyPhone}
                    disabled={loadingVerify}
                    className="mt-5 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center"
                  >
                    {loadingVerify ? <LoadingDots /> : "Verify number"}
                  </button>
                )}

                {/* OTP SECTION */}
                {showOtp && (
                  <>
                    <div className="mt-6 flex justify-center">
                      <OtpInput
                        value={otp}
                        onChange={(value) => dispatch(setOtp(value))}
                        numInputs={6}
                        inputType="tel"
                        shouldAutoFocus
                        containerStyle="flex justify-between gap-3"
                        inputStyle={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "18px",
                        }}
                        focusStyle={{
                          outline: "2px solid #3b82f6",
                        }}
                        renderInput={(props) => <input {...props} />}
                      />
                    </div>

                    <div className="mt-4 text-center text-sm">
                      {timer > 0 ? (
                        <p className="text-gray-500">Resend OTP in {timer}s</p>
                      ) : (
                        <button
                          onClick={handleResendOtp}
                          className="text-blue-600 hover:underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleSubmitOtp}
                      disabled={loadingOtp}
                      className="mt-5 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center"
                    >
                      {loadingOtp ? <LoadingDots /> : "Submit OTP"}
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    dispatch(setLoginMode("qr"));
                    dispatch(setShowOtp(false));
                    dispatch(setOtp(""));
                    dispatch(setPhone(""));
                  }}
                  className="mt-6 text-blue-600 text-sm hover:underline"
                >
                  ← Back to QR login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
