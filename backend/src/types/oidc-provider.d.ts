/**
 * Type declarations for oidc-provider v9.5.2
 *
 * Extends the oidc-provider module with proper TypeScript types.
 * The official @types/oidc-provider package is outdated, so we define
 * the necessary types here for type safety.
 */

declare module 'oidc-provider' {
  import { Middleware } from 'koa';
  import { IncomingMessage, ServerResponse } from 'http';

  // ===== Core Provider Class =====

  export default class Provider {
    constructor(issuer: string, configuration: Configuration);

    callback(): Middleware;
    interactionDetails(req: IncomingMessage, res: ServerResponse): Promise<InteractionDetails>;
    interactionFinished(req: IncomingMessage, res: ServerResponse, result: InteractionResults, options?: { mergeWithLastSubmission?: boolean }): Promise<void>;
    interactionResult(req: IncomingMessage, res: ServerResponse, result: InteractionResults, options?: { mergeWithLastSubmission?: boolean }): Promise<string>;
    on(event: string, listener: (...args: any[]) => void): this;

    AccessToken: any;
    AuthorizationCode: any;
    Client: any;
    Session: any;
    Grant: any;

    readonly issuer: string;
  }

  // ===== Configuration Types =====

  export interface Configuration {
    adapter?: AdapterFactory;
    clients?: ClientMetadata[];
    cookies?: CookiesConfiguration;
    jwks?: { keys: JWK[] };
    features?: FeaturesConfiguration;
    interactions?: InteractionsConfiguration;
    scopes?: string[] | Set<string>;
    claims?: ClaimsConfiguration;
    ttl?: TTLConfiguration;
    routes?: RoutesConfiguration;
    responseTypes?: string[];
    grantTypes?: string[];
    pkce?: PKCEConfiguration;
    findAccount?: FindAccount;
    renderError?: RenderError;
    formats?: FormatsConfiguration;
    conformIdTokenClaims?: boolean;
    loadExistingGrant?: LoadExistingGrant;
    issueRefreshToken?: IssueRefreshToken;
    [key: string]: any; // Allow additional properties
  }

  // ===== Adapter Interface =====

  export type AdapterFactory = (name: string) => Adapter;

  export interface Adapter {
    upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void>;
    find(id: string): Promise<AdapterPayload | undefined>;
    findByUserCode(userCode: string): Promise<AdapterPayload | undefined>;
    findByUid(uid: string): Promise<AdapterPayload | undefined>;
    consume(id: string): Promise<void>;
    destroy(id: string): Promise<void>;
    revokeByGrantId(grantId: string): Promise<void>;
  }

  export interface AdapterPayload {
    [key: string]: any;
    accountId?: string;
    acr?: string;
    amr?: string[];
    authTime?: number;
    claims?: any;
    clientId?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    consumed?: number;
    error?: string;
    errorDescription?: string;
    exp?: number;
    grantId?: string;
    gty?: string;
    iat?: number;
    jti?: string;
    kind?: string;
    nonce?: string;
    redirectUri?: string;
    resource?: string;
    rotations?: number;
    scope?: string;
    sessionUid?: string;
    sid?: string;
    uid?: string;
    userCode?: string;
  }

  // ===== Client Configuration =====

  export interface ClientMetadata {
    client_id: string;
    client_name?: string;
    client_secret?: string;
    redirect_uris: string[];
    response_types?: string[];
    grant_types?: string[];
    application_type?: string;
    contacts?: string[];
    client_uri?: string;
    logo_uri?: string;
    scope?: string;
    tos_uri?: string;
    policy_uri?: string;
    token_endpoint_auth_method?: string;
    post_logout_redirect_uris?: string[];
  }

  // ===== Cookies Configuration =====

  export interface CookiesConfiguration {
    keys?: string[];
    long?: CookieOptions;
    short?: CookieOptions;
    names?: {
      session?: string;
      interaction?: string;
      resume?: string;
      state?: string;
    };
  }

  export interface CookieOptions {
    signed?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    domain?: string;
  }

  // ===== Features Configuration =====

  export interface FeaturesConfiguration {
    devInteractions?: { enabled: boolean };
    clientCredentials?: { enabled: boolean };
    deviceFlow?: { enabled: boolean };
    encryption?: { enabled: boolean };
    introspection?: { enabled: boolean };
    jwtIntrospection?: { enabled: boolean };
    jwtResponseModes?: { enabled: boolean };
    pushedAuthorizationRequests?: { enabled: boolean };
    registration?: { enabled: boolean };
    registrationManagement?: { enabled: boolean };
    resourceIndicators?: { enabled: boolean };
    revocation?: { enabled: boolean };
    rpInitiatedLogout?: { enabled: boolean };
    userinfo?: { enabled: boolean };
    pkce?: { enabled: boolean; methods?: string[]; required?: any };
    [key: string]: any; // Allow additional properties
  }

  // ===== Interactions Configuration =====

  export interface InteractionsConfiguration {
    url?: (ctx: KoaContextWithOIDC, interaction: Interaction) => string | Promise<string>;
  }

  export interface Interaction {
    uid: string;
    prompt: Prompt;
    params: any;
    lastSubmission?: any;
    session?: Session;
  }

  export interface Prompt {
    name: string;
    reasons: string[];
    details: any;
  }

  export interface Session {
    accountId?: string;
    uid?: string;
    cookie?: string;
    acr?: string;
    amr?: string[];
  }

  // ===== Interaction Details & Results =====

  export interface InteractionDetails {
    uid: string;
    prompt: Prompt;
    params: any;
    session?: Session;
    lastSubmission?: any;
    grantId?: string;
    [key: string]: any; // Allow additional properties
  }

  export interface InteractionResults {
    login?: {
      accountId: string;
      acr?: string;
      amr?: string[];
      remember?: boolean;
      ts?: number;
    };
    consent?: {
      grantId?: string;
      rejectedScopes?: string[];
      rejectedClaims?: string[];
    };
    select_account?: {
      accountId: string;
    };
    error?: string;
    error_description?: string;
  }

  // ===== Claims Configuration =====

  export interface ClaimsConfiguration {
    [key: string]: string[];
  }

  // ===== TTL Configuration =====

  export interface TTLConfiguration {
    AccessToken?: number | TTLFunction;
    AuthorizationCode?: number | TTLFunction;
    ClientCredentials?: number | TTLFunction;
    DeviceCode?: number | TTLFunction;
    IdToken?: number | TTLFunction;
    RefreshToken?: number | TTLFunction;
    Interaction?: number | TTLFunction;
    Session?: number | TTLFunction;
    Grant?: number | TTLFunction;
  }

  export type TTLFunction = (ctx: KoaContextWithOIDC, token: any, client: Client) => number;

  // ===== Routes Configuration =====

  export interface RoutesConfiguration {
    authorization?: string;
    check_session?: string;
    code_verification?: string;
    device_authorization?: string;
    end_session?: string;
    introspection?: string;
    jwks?: string;
    pushed_authorization_request?: string;
    registration?: string;
    revocation?: string;
    token?: string;
    userinfo?: string;
  }

  // ===== PKCE Configuration =====

  export interface PKCEConfiguration {
    methods?: string[];
    required?: (ctx: KoaContextWithOIDC, client: Client) => boolean;
  }

  // ===== Helper Functions =====

  export type FindAccount = (ctx: KoaContextWithOIDC, sub: string, token?: any) => Promise<Account | undefined>;

  export interface Account {
    accountId: string;
    claims: (use: string, scope: string, claims: any, rejected: string[]) => Promise<any>;
  }

  export type RenderError = (ctx: KoaContextWithOIDC, out: ErrorOut, error: Error) => void | Promise<void>;

  export interface ErrorOut {
    error: string;
    error_description?: string;
  }

  export interface FormatsConfiguration {
    AccessToken?: string | FormatFunction;
    ClientCredentials?: string | FormatFunction;
  }

  export type FormatFunction = (ctx: KoaContextWithOIDC, token: any) => string;

  export type LoadExistingGrant = (ctx: KoaContextWithOIDC) => Promise<Grant | undefined>;

  export interface Grant {
    accountId: string;
    clientId: string;
    openid: { scope: string };
    [key: string]: any;
  }

  export type IssueRefreshToken = (ctx: KoaContextWithOIDC, client: Client, code: any) => boolean | Promise<boolean>;

  export interface Client {
    clientId: string;
    clientSecret?: string;
    redirectUris: string[];
    grantTypes: string[];
    responseTypes: string[];
    [key: string]: any;
  }

  // ===== Koa Context =====

  export interface KoaContextWithOIDC {
    req: IncomingMessage;
    res: ServerResponse;
    oidc: {
      entities: {
        Client?: Client;
        Session?: Session;
        Grant?: Grant;
        Account?: Account;
        [key: string]: any;
      };
      provider: Provider;
      params?: any;
      route?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }

  // ===== JWK Types =====

  export interface JWK {
    kty: string;
    use?: string;
    key_ops?: string[];
    alg?: string;
    kid?: string;
    x5u?: string;
    x5c?: string[];
    x5t?: string;
    'x5t#S256'?: string;
    // RSA
    n?: string;
    e?: string;
    d?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
    // EC
    crv?: string;
    x?: string;
    y?: string;
    // Symmetric
    k?: string;
  }
}
