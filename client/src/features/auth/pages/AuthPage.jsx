import React, { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Step from "../components/Step";
import { useNavigate } from "react-router-dom";
import Env from "../../../core/config/env";

const countries = [
  { name: "India", code: "91" },
  { name: "United States", code: "1" },
  { name: "Canada", code: "1" },
];

const AuthPage = () => {
  const qrValue = Env.qrValue;
  const navigate = useNavigate();

  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loginMode, setLoginMode] = useState("qr");
  const [showOtp, setShowOtp] = useState(false);

  const [country, setCountry] = useState(countries[0]);
  const [phone, setPhone] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);

  const handleOtpChange = (value, index) => {
    if (!/^[a-zA-Z0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleSubmitOtp = () => {
    const enteredOtp = otp.join("");
    console.log("Phone:", fullPhone);
    console.log("OTP:", enteredOtp);
    const fakeToken = Env.fakeToken;
    localStorage.setItem("token", fakeToken);
    navigate("/");
  };

  const fullPhone = `+${country.code}${phone}`;

  return (
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
                  Tap <span className="font-medium text-gray-900">Profile</span>
                </>
              }
            />

            <Step
              number="3"
              text={
                <>
                  Go to
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
                  setLoginMode("phone");
                  setShowOtp(false);
                  setOtp(["", "", "", "", "", ""]);
                  setPhone("");
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
              <div className="space-y-3">
                {/* ROW 1 — Country selector */}
                <select
                  value={country.name}
                  onChange={(e) =>
                    setCountry(
                      countries.find((c) => c.name === e.target.value) ||
                        countries[0],
                    )
                  }
                  className="w-full border rounded-lg px-4 py-3 bg-gray-100 outline-none"
                >
                  {countries.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {/* ROW 2 — Code + Phone */}
                <div className="flex border rounded-lg overflow-hidden">
                  {/* Country code */}
                  <div className="flex items-center px-4 bg-gray-50 text-gray-700 border-r">
                    +{country.code}
                  </div>
                  {/* Phone number */}
                  <input
                    type="tel"
                    placeholder="Your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 px-4 py-3 outline-none"
                  />
                </div>
              </div>

              {/* VERIFY NUMBER */}
              {!showOtp && (
                <button
                  onClick={() => {
                    console.log("Phone:", fullPhone);
                    setShowOtp(true);
                  }}
                  className="mt-5 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                >
                  Verify number
                </button>
              )}

              {/* OTP INPUT */}
              {showOtp && (
                <>
                  <div className="flex justify-between mt-6">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (inputs.current[index] = el)}
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, index)}
                        maxLength={1}
                        className="w-12 h-12 border rounded-lg text-center text-lg outline-blue-500"
                      />
                    ))}
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
                  setLoginMode("qr");
                  setShowOtp(false);
                  setOtp(["", "", "", "", "", ""]);
                  setPhone("");
                }}
                className="mt-6 text-blue-600 text-sm hover:underline"
              >
                ← Back to QR login
              </button>
            </div>
          )}

          <p className="mt-8 text-sm text-gray-500 text-center">
            Don't have an account?
            <span className="text-blue-600 font-medium cursor-pointer hover:underline">
              Get started
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
