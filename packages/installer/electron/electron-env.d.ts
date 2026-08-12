/// <reference types="vite-plugin-electron/electron-env" />

import type { InstallerApi } from './preload'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_ROOT: string
      VITE_PUBLIC: string
    }
  }

  interface Window {
    installer: InstallerApi
  }
}
