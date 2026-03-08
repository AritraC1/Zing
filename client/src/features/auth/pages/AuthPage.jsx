import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import OtpInput from "react-otp-input";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import Step from "../components/Step";
import Env from "../../../core/config/env";
import {
  setLoginMode,
  setPhone,
  setOtp,
  setShowOtp,
  loginSuccess,
} from "../store/authReducer";

const AuthPage = () => {
  const qrValue = Env.qrValue;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loginMode, showOtp, phone, otp } = useSelector((state) => state.auth);

  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [timer, setTimer] = useState(30);

  // OTP TIMER
  useEffect(() => {
    let interval;

    if (showOtp && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [showOtp, timer]);

  // VERIFY PHONE
  const handleVerifyPhone = () => {
    if (!isValidPhoneNumber(phone)) {
      toast.error("Invalid phone number");
      return;
    }

    dispatch(setShowOtp(true));
    setTimer(30);

    toast.success("OTP sent successfully");
  };

  // SUBMIT OTP
  const handleSubmitOtp = () => {
    if (otp.length !== 6) {
      toast.error("Please enter complete OTP");
      return;
    }

    const fakeToken = Env.fakeToken;
    dispatch(loginSuccess(fakeToken));
    localStorage.setItem("token", fakeToken);

    toast.success("Login successful");

    navigate("/chat");
  };

  // RESEND OTP
  const handleResendOtp = () => {
    dispatch(setOtp(""));
    setTimer(30);

    toast.info("OTP resent");
  };

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

            <div className="mt-10 flex items-center justify-between text-sm text-gray-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stayLoggedIn}
                  onChange={() => setStayLoggedIn(!stayLoggedIn)}
                  className="accent-blue-600 w-4 h-4"
                />
                Stay logged in on this browser
              </label>
            </div>

            <p className="mt-6 text-xs text-gray-400">
              Keep your phone connected to the internet while using Zing Web.
            </p>
          </div>

          {/* RIGHT SIDE */}
          <div className="w-full md:w-105 bg-gray-50 flex flex-col items-center justify-center p-10 border-l">
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

                {/* PHONE INPUT */}
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
                    className="mt-5 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                  >
                    Verify number
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

                    {/* TIMER / RESEND */}
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
                      className="mt-5 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                    >
                      Submit OTP
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

            <p className="mt-8 text-sm text-gray-500 text-center">
              Don't have an account?{" "}
              <span className="text-blue-600 font-medium cursor-pointer hover:underline">
                Get started
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
