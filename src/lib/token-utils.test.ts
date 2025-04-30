import { isTokenExpired } from './token-utils';

describe('Token Utilities', () => {
  describe('isTokenExpired', () => {
    beforeAll(() => {
      // Mock Date.now to return a fixed timestamp for testing
      jest.spyOn(Date, 'now').mockImplementation(() => 1625097600000); // 2021-07-01T00:00:00Z in milliseconds
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('returns true if token is already expired', () => {
      // Token expired 1 hour ago
      const expiresAt = Math.floor(Date.now() / 1000) - 3600;
      expect(isTokenExpired(expiresAt)).toBe(true);
    });

    it('returns true if token expires within buffer time (5 minutes)', () => {
      // Token expires in 4 minutes
      const expiresAt = Math.floor(Date.now() / 1000) + 240;
      expect(isTokenExpired(expiresAt)).toBe(true);
    });

    it('returns false if token is still valid beyond buffer time', () => {
      // Token expires in 10 minutes
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      expect(isTokenExpired(expiresAt)).toBe(false);
    });

    it('returns false if token expires far in the future', () => {
      // Token expires in 1 hour
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      expect(isTokenExpired(expiresAt)).toBe(false);
    });
  });

  // Note: The other functions in token-utils.ts involve cookies and encryption
  // which are more complex to test and would require more extensive mocking.
  // For a complete test suite, those would need separate tests with proper mocks
  // for the cookies and jose libraries.
});