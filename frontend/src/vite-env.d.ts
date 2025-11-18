/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_TAGLINE: string
  readonly VITE_APP_URL: string
  readonly VITE_IDP_URL: string
  readonly VITE_NODE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Git information injected at build time
declare const __GIT_BRANCH__: string
declare const __GIT_COMMIT__: string
