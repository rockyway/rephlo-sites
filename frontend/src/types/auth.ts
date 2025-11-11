/**
 * Authentication Types
 *
 * Type definitions for OAuth/OIDC authentication flow
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  emailVerified: boolean;
  createdAt: string;
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: () => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  scope: string;
  responseType: 'code';
  codeChallengeMethod: 'S256';
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface UserinfoResponse {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  role?: 'admin' | 'user';
  permissions?: string[];
  created_at?: string;
}

export interface PKCEPair {
  verifier: string;
  challenge: string;
}
