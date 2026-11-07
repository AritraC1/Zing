const {
  createAccessTokenForUser,
  createRefreshTokenForUser,
  validateAccessToken,
  validateRefreshToken,
} = require("./jwtTokenUtil");
const hashToken = require("./hash");
const AppError = require("../errors/AppError");

describe("JWT Token Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = "test-access-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("createAccessTokenForUser", () => {
    it("creates a valid access token with user payload", () => {
      const payload = { id: "user-123", phoneNumber: "+15551234567" };
      const token = createAccessTokenForUser(payload);

      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT has 3 parts
    });
  });

  describe("createRefreshTokenForUser", () => {
    it("creates a valid refresh token with user payload", () => {
      const payload = { id: "user-123", phoneNumber: "+15551234567" };
      const token = createRefreshTokenForUser(payload);

      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });
  });

  describe("validateAccessToken", () => {
    it("validates a correct access token and returns payload", () => {
      const payload = { id: "user-123", phoneNumber: "+15551234567" };
      const token = createAccessTokenForUser(payload);
      const decoded = validateAccessToken(token);

      expect(decoded.id).toBe("user-123");
      expect(decoded.phoneNumber).toBe("+15551234567");
    });

    it("throws JsonWebTokenError for invalid token", () => {
      const { JsonWebTokenError } = require("jsonwebtoken");
      expect(() => validateAccessToken("invalid.token.here")).toThrow(JsonWebTokenError);
    });

    it("throws JsonWebTokenError for token signed with wrong secret", () => {
      // Create token with different secret
      const jwt = require("jsonwebtoken");
      const wrongSecretToken = jwt.sign({ id: "user-123" }, "wrong-secret", { expiresIn: "15m" });
      expect(() => validateAccessToken(wrongSecretToken)).toThrow();
    });
  });

  describe("validateRefreshToken", () => {
    it("validates a correct refresh token and returns payload", () => {
      const payload = { id: "user-123", phoneNumber: "+15551234567" };
      const token = createRefreshTokenForUser(payload);
      const decoded = validateRefreshToken(token);

      expect(decoded.id).toBe("user-123");
      expect(decoded.phoneNumber).toBe("+15551234567");
    });

    it("throws JsonWebTokenError for invalid token", () => {
      const { JsonWebTokenError } = require("jsonwebtoken");
      expect(() => validateRefreshToken("invalid.token.here")).toThrow(JsonWebTokenError);
    });
  });
});

describe("Hash Utility", () => {
  it("produces consistent hash for same input", () => {
    const input = "test-token-123";
    const hash1 = hashToken(input);
    const hash2 = hashToken(input);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(input);
    expect(hash1.length).toBe(64); // SHA256 hex length
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});