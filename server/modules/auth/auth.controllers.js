const redis = require("../../config/redis");
const UserRepo = require("../users/users.repo");

const requestOtp = async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        error: "phone number is required",
      });
    }

    const generateOtp = () => {
      return Math.floor(100000 + Math.random() * 900000);
    };

    const otp = generateOtp();
    const key = `otp for ${phone_number}`;
    await redis.set(key, otp, "EX", 300);

    return res.status(200).json({
      message: `OTP Sent to ${phone_number}`,
      otp,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to send OTP",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || otp === undefined || otp === null) {
      return res.status(400).json({
        error: "phone number and otp are required",
      });
    }

    // Verify OTP
    const key = `otp for ${phone_number}`;
    const storedOtp = await redis.get(key);

    if (!storedOtp) {
      return res.status(400).json({
        error: "OTP expired or not found",
      });
    }

    // storedOtp comes from redis as a string
    if (storedOtp !== otp.toString()) {
      return res.status(400).json({
        error: "Invalid OTP",
      });
    }

    await redis.del(key);

    // Check if user exists
    const user = await UserRepo.findByPhone(phone_number);

    // If user does not exist, create one
    if (!user) {
      await UserRepo.createUser(phone_number);
    }

    return res.status(200).json({
      message: "OTP verified",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      error: "OTP verification failed",
    });
  }
};

module.exports = {
  requestOtp,
  verifyOtp,
};
