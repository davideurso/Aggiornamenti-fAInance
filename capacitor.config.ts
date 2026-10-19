/// <reference types="@capacitor-firebase/authentication" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.fainanceapp.app',
  appName: 'fAInance',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      authDomain: 'auth.fainanceapp.it',
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
    },
  },
};

export default config;
