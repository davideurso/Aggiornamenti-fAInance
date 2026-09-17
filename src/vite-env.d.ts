/// <reference types="vite/client" />

interface Window {
  Capacitor?: any;
  __fainancePendingWidgetRoute?: string;
}

declare module "*.png" {
  const source: string;
  export default source;
}

