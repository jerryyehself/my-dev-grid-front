/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent, ComponentPublicInstance } from 'vue'

  const component: DefineComponent<object, object, never>
  export default component
}
