/**
 * Type declarations for oidc-provider
 * Since @types/oidc-provider doesn't exist, we declare basic types here
 */

declare module 'oidc-provider' {
  import { Request, Response } from 'express';

  export interface AdapterPayload {
    [key: string]: any;
    grantId?: string;
    userCode?: string;
    uid?: string;
    consumed?: number;
  }

  export interface Configuration {
    [key: string]: any;
  }

  export interface KoaContextWithOIDC {
    oidc: {
      [key: string]: any;
    };
  }

  export default class Provider {
    constructor(issuer: string, configuration: Configuration);
    callback(): any;
    interactionDetails(req: Request, res: Response): Promise<any>;
    interactionFinished(req: Request, res: Response, result: any, options?: any): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): void;
    Client: {
      find(clientId: string): Promise<any>;
    };
    Grant: any;
  }
}
