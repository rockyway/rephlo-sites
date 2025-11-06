/**
 * Type declarations for oidc-provider
 *
 * Minimal type declarations to allow TypeScript compilation.
 * The oidc-provider package doesn't ship with TypeScript definitions.
 */

declare module 'oidc-provider' {
  import { RequestHandler } from 'express';

  class Provider {
    constructor(issuer: string, configuration: any);
    callback: RequestHandler;
    [key: string]: any;
  }

  export default Provider;
}
