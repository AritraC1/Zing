import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import OtpInput from "react-otp-input";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  setPhone,
  setOtp,
  setShowOtp,
} from "../store/authReducer";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../../core/config/firebaseConfig";
import { verifyOtpThunk } from "../api/authThunk";
import generateDeviceDetails from "../../../shared/utils/generateDeviceDetails";
import { getMyDetailsThunk } from "../../profile/api/profileThunk";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  RotateCw,
  Pencil,
  Phone,
  Lock,
} from "lucide-react";

const AuthPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { showOtp, phone, otp } = useSelector((state) => state.auth);

  const [timer, setTimer] = useState(30);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);

  // State to store the Firebase confirmation session
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {
          // ignore cleanup errors
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // OTP Timer countdown
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
  const handleVerifyPhone = async (e) => {
    if (e) e.preventDefault();

    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error("Please enter a valid phone number");
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
      toast.success("Verification code sent!");
    } catch (error) {
      console.error("SMS Error:", error);
      toast.error("Failed to send verification code. Please try again.");

      // Reset reCAPTCHA on failure so it can be re-initialized
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoadingVerify(false);
    }
  };

  // Submit OTP
  const handleSubmitOtp = async (e) => {
    if (e) e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    if (!confirmationResult) {
      toast.error("Session expired. Please request a new code.");
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

      toast.success("Phone verified successfully!");

      if (isNewUser || !profileCompleted) {
        navigate("/onboard");
      } else {
        await dispatch(getMyDetailsThunk());
        navigate("/chat");
      }
    } catch (error) {
      console.error(error);
      const message =
        typeof error === "string"
          ? error
          : error?.error || error?.message || "Invalid or expired code";
      toast.error(message);
    } finally {
      setLoadingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = () => {
    if (timer > 0 || loadingVerify) return;
    dispatch(setOtp(""));
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {
        // ignore
      }
      window.recaptchaVerifier = null;
    }
    handleVerifyPhone();
  };

  // Switch back to editing phone
  const handleBackToPhone = () => {
    dispatch(setShowOtp(false));
    dispatch(setOtp(""));
    setConfirmationResult(null);
    setTimer(30);
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {
        // ignore
      }
      window.recaptchaVerifier = null;
    }
  };

  // Loading Dots Animation
  const LoadingDots = () => (
    <div className="flex items-center justify-center gap-1.5 py-0.5">
      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
    </div>
  );

  const isPhoneValid = Boolean(phone && isValidPhoneNumber(phone));

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden">
      {/* Background Ambience & Blobs */}
      <div className="absolute inset-0 bg-linear-to-b from-white via-slate-50/50 to-emerald-50/30 pointer-events-none" />

      {/* Decorative Gradient Blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 sm:w-128 sm:h-128 rounded-full bg-emerald-200/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 sm:w-112 sm:h-112 rounded-full bg-teal-200/40 blur-3xl pointer-events-none" />

      {/* Subtle Dot Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, #10b98133 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />

      {/* Top Bar / Navigation */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 pt-2 sm:pt-4">
        <button
          onClick={() => navigate("/")}
          className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs transition-transform group-hover:-translate-x-0.5">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </div>
          <span className="hidden sm:inline">Back to home</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <span
              className="text-white font-black text-sm"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Z
            </span>
          </div>
          <span
            className="text-lg font-black text-slate-900 tracking-tight"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Zing
          </span>
        </div>
      </header>

      {/* Main Auth Card */}
      <main className="w-full max-w-md my-auto z-10 py-6 sm:py-8">
        <div className="backdrop-blur-xl bg-white/90 border border-slate-200/70 shadow-2xl shadow-slate-200/50 rounded-3xl p-6 sm:p-9 transition-all duration-300">
          {/* Card Brand Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4 group transition-transform duration-300 hover:scale-105">
              {showOtp ? (
                <Lock className="w-7 h-7 text-white stroke-[2.2]" />
              ) : (
                <Phone className="w-7 h-7 text-white stroke-[2.2]" />
              )}
            </div>

            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
              {showOtp ? "Verify your phone" : "Welcome to Zing"}
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed">
              {showOtp ? (
                <span>
                  Enter the 6-digit verification code sent to{" "}
                  <span className="font-semibold text-slate-800">{phone}</span>
                </span>
              ) : (
                "Enter your phone number to sign in or create your Zing account."
              )}
            </p>

            {/* In OTP mode: Quick pill button to change phone number */}
            {showOtp && (
              <button
                type="button"
                onClick={handleBackToPhone}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Pencil className="w-3 h-3 text-emerald-600" />
                <span>Change number</span>
              </button>
            )}
          </div>

          {/* Form Content */}
          <div className="mt-8">
            {!showOtp ? (
              /* PHONE INPUT STEP */
              <form onSubmit={handleVerifyPhone} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <PhoneInput
                      defaultCountry="IN"
                      international
                      countryCallingCodeEditable={false}
                      value={phone}
                      onChange={(value) => dispatch(setPhone(value || ""))}
                      placeholder="Enter phone number"
                      disabled={loadingVerify}
                      className="
                        w-full flex items-center px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 
                        hover:border-slate-300 focus-within:bg-white focus-within:border-emerald-500 
                        focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-200
                        [&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center [&_.PhoneInputCountry]:gap-1.5
                        [&_.PhoneInputCountry]:pr-3 [&_.PhoneInputCountry]:mr-3 [&_.PhoneInputCountry]:border-r 
                        [&_.PhoneInputCountry]:border-slate-200
                        [&_.PhoneInputCountrySelect]:cursor-pointer
                        [&_.PhoneInputCountryIcon]:w-6 [&_.PhoneInputCountryIcon]:h-4 [&_.PhoneInputCountryIcon]:rounded-xs [&_.PhoneInputCountryIcon]:overflow-hidden [&_.PhoneInputCountryIcon]:shadow-xs
                        [&_.PhoneInputCountrySelectArrow]:border-slate-400 [&_.PhoneInputCountrySelectArrow]:opacity-70
                        [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-slate-900 
                        [&_.PhoneInputInput]:placeholder-slate-400 [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:font-medium
                        [&_.PhoneInputInput]:text-base [&_.PhoneInputInput]:tracking-wide
                      "
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Include your country code and phone number
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!isPhoneValid || loadingVerify}
                  className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm text-white bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loadingVerify ? (
                    <LoadingDots />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* OTP INPUT STEP */
              <form onSubmit={handleSubmitOtp} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 text-center">
                    6-Digit Verification Code
                  </label>
                  <div className="flex justify-center">
                    <OtpInput
                      value={otp}
                      onChange={(value) => dispatch(setOtp(value))}
                      numInputs={6}
                      inputType="tel"
                      shouldAutoFocus
                      containerStyle="flex items-center justify-between gap-2 sm:gap-3 w-full"
                      inputStyle={{
                        width: "100%",
                        maxWidth: "48px",
                        height: "54px",
                        borderRadius: "14px",
                        border: "1.5px solid #e2e8f0",
                        backgroundColor: "#f8fafc",
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#0f172a",
                        textAlign: "center",
                        transition: "all 0.2s ease",
                      }}
                      focusStyle={{
                        borderColor: "#10b981",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.15)",
                        outline: "none",
                      }}
                      renderInput={(props) => (
                        <input
                          {...props}
                          className="focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:ring-4 focus:ring-emerald-500/15 shadow-xs"
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Resend OTP Timer & Button */}
                <div className="flex items-center justify-center text-xs sm:text-sm">
                  {timer > 0 ? (
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <span>Resend code in</span>
                      <span className="font-semibold text-emerald-600 tabular-nums">
                        {timer}s
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loadingVerify}
                      className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Resend code</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={otp.length !== 6 || loadingOtp}
                    className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm text-white bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loadingOtp ? (
                      <LoadingDots />
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToPhone}
                    className="w-full py-2.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    ← Use a different number
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Privacy & Security Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>End-to-end encrypted • Fast & secure</span>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="w-full max-w-md mx-auto text-center z-10 pb-2">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Zing. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default AuthPage;