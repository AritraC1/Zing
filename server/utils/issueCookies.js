const { baseCookieOptions } = require("./cookieOptions");

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days
const ONBOARDING_TOKEN_MAX_AGE = 10 * 60 * 1000; // 10 minutes (new user flow)

// Sets the httpOnly auth cookies for a user.
// - refreshToken is optional: when absent the accessToken is treated as a
//   short-lived onboarding token.
// - shortLived explicitly forces the onboarding TTL for the access token.
const issueCookies = (
  res,
  { accessToken, refreshToken = null, shortLived = false },
) => {
  const accessMaxAge = shortLived
    ? ONBOARDING_TOKEN_MAX_AGE
    : ACCESS_TOKEN_MAX_AGE;

  res.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    maxAge: accessMaxAge,
  });

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", baseCookieOptions);
  res.clearCookie("refreshToken", baseCookieOptions);
};

module.exports = {
  issueCookies,
  clearAuthCookies,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  ONBOARDING_TOKEN_MAX_AGE,
};
