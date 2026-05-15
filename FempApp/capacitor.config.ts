import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fempapp.app',
  appName: 'FempApp',
  webDir: 'dist/femp-app/browser',
  server: {
    androidScheme: 'http'
  }
};

export default config;