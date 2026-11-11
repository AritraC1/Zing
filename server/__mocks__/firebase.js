// Firebase Admin mock for tests.
// Mirrors the lazy API of core/config/firebase.config.js so both
// auth.service (getFirebaseAdmin) and the push service resolve here.
const mockAuth = {
  verifyIdToken: jest.fn(),
};

const mockSendEachForMulticast = jest.fn().mockResolvedValue({
  successCount: 0,
  failureCount: 0,
  responses: [],
});

const mockMessaging = () => ({
  sendEachForMulticast: mockSendEachForMulticast,
});

const mockAdmin = {
  auth: () => mockAuth,
  messaging: mockMessaging,
};

module.exports = {
  getFirebaseAdmin: jest.fn(() => mockAdmin),
  isFirebaseAdminAvailable: jest.fn(() => true),
  // Allow tests to access the mock directly
  _mockAuth: mockAuth,
  _mockMessagingSend: mockSendEachForMulticast,
};
