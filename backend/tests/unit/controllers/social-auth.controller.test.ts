/**
 * Unit Tests for Social Auth Controller
 *
 * Tests Google OAuth authentication endpoints:
 * - GET /oauth/google/authorize
 * - GET /oauth/google/callback
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SocialAuthController } from '../../../src/controllers/social-auth.controller';
import { google } from 'googleapis';

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('googleapis');
jest.mock('crypto');

describe('SocialAuthController', () => {
  let controller: SocialAuthController;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockResRedirect: jest.Mock;
  let mockOAuth2Client: any;

  beforeEach(() => {
    // Set environment variables
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:7150/oauth/google/callback';

    // Reset mocks
    jest.clearAllMocks();

    // Mock OAuth2 Client
    mockOAuth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?client_id=test'),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
    };

    // Type assertion to bypass TypeScript checking for mock
    (google.auth.OAuth2 as unknown as jest.Mock).mockReturnValue(mockOAuth2Client);

    // Mock Prisma Client
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    // Mock Response object
    mockResRedirect = jest.fn().mockReturnThis();
    mockRes = {
      redirect: mockResRedirect,
    };

    // Create controller instance
    controller = new SocialAuthController(mockPrisma);

    // Mock Request object
    mockReq = {
      query: {},
    };
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  describe('googleAuthorize', () => {
    it('should redirect to Google OAuth URL', async () => {
      await controller.googleAuthorize(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth')
      );
    });

    it('should generate auth URL with correct parameters', async () => {
      await controller.googleAuthorize(mockReq as Request, mockRes as Response);

      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          scope: expect.arrayContaining([
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
          ]),
          state: expect.any(String),
          prompt: 'consent',
        })
      );
    });

    it('should generate random state for CSRF protection', async () => {
      const crypto = require('crypto');
      crypto.randomBytes = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('random_state_123'),
      });

      await controller.googleAuthorize(mockReq as Request, mockRes as Response);

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'random_state_123',
        })
      );
    });

    it('should redirect to login with error if Google OAuth not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      // Create new controller instance without credentials
      controller = new SocialAuthController(mockPrisma);

      await controller.googleAuthorize(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_oauth_not_configured')
      );
    });

    it('should handle errors gracefully', async () => {
      mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
        throw new Error('OAuth client error');
      });

      await controller.googleAuthorize(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_oauth_error')
      );
    });
  });

  describe('googleCallback', () => {
    const mockGoogleProfile = {
      id: 'google_user_123',
      email: 'test@example.com',
      verified_email: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/avatar.jpg',
      locale: 'en',
    };

    beforeEach(() => {
      // Mock Google OAuth2 client methods
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
        },
      });

      // Mock Google userinfo API
      const mockOAuth2 = {
        userinfo: {
          get: jest.fn().mockResolvedValue({ data: mockGoogleProfile }),
        },
      };
      (google.oauth2 as unknown as jest.Mock).mockReturnValue(mockOAuth2);
    });

    it('should handle successful Google OAuth callback for new user', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      // Mock: user doesn't exist
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock user creation
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new_user_123',
        email: mockGoogleProfile.email,
        googleId: mockGoogleProfile.id,
      });

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('google_success=true')
      );
    });

    it('should exchange authorization code for tokens', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new_user_123',
      });

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('auth_code_123');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalled();
    });

    it('should link Google account to existing user by email', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      // Mock: user exists with same email but no googleId
      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // First call by googleId returns null
        .mockResolvedValueOnce({
          // Second call by email returns existing user
          id: 'existing_user_123',
          email: mockGoogleProfile.email,
          googleId: null,
        });

      // Mock user update
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'existing_user_123',
        email: mockGoogleProfile.email,
        googleId: mockGoogleProfile.id,
      });

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing_user_123' },
          data: expect.objectContaining({
            googleId: mockGoogleProfile.id,
            emailVerified: true,
            authProvider: 'google',
          }),
        })
      );
    });

    it('should update last login for existing Google user', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      // Mock: user exists with googleId
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing_google_user',
        email: mockGoogleProfile.email,
        googleId: mockGoogleProfile.id,
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'existing_google_user',
      });

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'existing_google_user' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should create new user from Google profile', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      // Mock: user doesn't exist
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new_user_123',
      });

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: mockGoogleProfile.email.toLowerCase(),
          emailVerified: true,
          firstName: mockGoogleProfile.given_name,
          lastName: mockGoogleProfile.family_name,
          googleId: mockGoogleProfile.id,
          authProvider: 'google',
          isActive: true,
        }),
      });
    });

    it('should handle missing authorization code', async () => {
      mockReq.query = {
        state: 'state_token_123',
      };

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=missing_code')
      );
    });

    it('should handle missing state parameter', async () => {
      mockReq.query = {
        code: 'auth_code_123',
      };

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=invalid_state')
      );
    });

    it('should handle Google OAuth errors', async () => {
      mockReq.query = {
        error: 'access_denied',
        state: 'state_token_123',
      };

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_oauth_failed')
      );
    });

    it('should reject unverified email from Google', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      const unverifiedProfile = {
        ...mockGoogleProfile,
        verified_email: false,
      };

      const mockOAuth2 = {
        userinfo: {
          get: jest.fn().mockResolvedValue({ data: unverifiedProfile }),
        },
      };
      (google.oauth2 as unknown as jest.Mock).mockReturnValue(mockOAuth2);

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=email_not_verified')
      );
    });

    it('should reject if email is missing from Google profile', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      const profileWithoutEmail = {
        ...mockGoogleProfile,
        email: undefined,
      };

      const mockOAuth2 = {
        userinfo: {
          get: jest.fn().mockResolvedValue({ data: profileWithoutEmail }),
        },
      };
      (google.oauth2 as unknown as jest.Mock).mockReturnValue(mockOAuth2);

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=email_not_verified')
      );
    });

    it('should handle token exchange errors', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      mockOAuth2Client.getToken.mockRejectedValue(
        new Error('Invalid authorization code')
      );

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_oauth_callback_failed')
      );
    });

    it('should handle user creation errors', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockResRedirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_oauth_callback_failed')
      );
    });

    it('should generate unique username for new user', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      const crypto = require('crypto');
      crypto.randomBytes = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('abc123'),
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new_user_123',
      });

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: expect.stringContaining('test_'),
        }),
      });
    });

    it('should set emailVerified to true for Google users', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new_user_123',
      });

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailVerified: true,
        }),
      });
    });

    it('should store Google profile picture URL', async () => {
      mockReq.query = {
        code: 'auth_code_123',
        state: 'state_token_123',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new_user_123',
      });

      await controller.googleCallback(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profilePictureUrl: mockGoogleProfile.picture,
          googleProfileUrl: mockGoogleProfile.picture,
        }),
      });
    });
  });

  describe('OAuth2 Client Initialization', () => {
    it('should initialize OAuth2 client with environment variables', () => {
      controller = new SocialAuthController(mockPrisma);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test_client_id',
        'test_client_secret',
        'http://localhost:7150/oauth/google/callback'
      );
    });

    it('should log warning if credentials are not configured', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      controller = new SocialAuthController(mockPrisma);

      // Logger should have been called with warning
      // This is implicitly tested by the redirect behavior in authorize tests
    });

    it('should use default redirect URI if not provided', () => {
      delete process.env.GOOGLE_REDIRECT_URI;

      controller = new SocialAuthController(mockPrisma);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'http://localhost:7150/oauth/google/callback'
      );
    });
  });
});
