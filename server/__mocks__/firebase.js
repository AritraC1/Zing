// Firebase Admin mock for tests
const mockAuth = {
  verifyIdToken: jest.fn(),
};

module.exports = {
  auth: () => mockAuth,
  // Allow tests to access the mock directly
  _mockAuth: mockAuth,
};