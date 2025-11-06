import request from 'supertest';
import { Express } from 'express';

/**
 * API Test Client with authentication support
 */
export class ApiTestClient {
  private app: Express;
  private token: string | null = null;

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Make authenticated GET request
   */
  get(url: string) {
    const req = request(this.app).get(url);
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    return req;
  }

  /**
   * Make authenticated POST request
   */
  post(url: string, data?: any) {
    const req = request(this.app)
      .post(url)
      .send(data || {});
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    return req;
  }

  /**
   * Make authenticated PATCH request
   */
  patch(url: string, data?: any) {
    const req = request(this.app)
      .patch(url)
      .send(data || {});
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    return req;
  }

  /**
   * Make authenticated DELETE request
   */
  delete(url: string) {
    const req = request(this.app).delete(url);
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    return req;
  }

  /**
   * Make authenticated PUT request
   */
  put(url: string, data?: any) {
    const req = request(this.app)
      .put(url)
      .send(data || {});
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    return req;
  }
}

/**
 * Create an API test client
 */
export const createApiClient = (app: Express): ApiTestClient => {
  return new ApiTestClient(app);
};
