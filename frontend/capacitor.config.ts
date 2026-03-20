import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gonza.salestracker',
  appName: 'Gonza Systems',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 6000,     
      launchAutoHide: true,         
      androidSplashResourceName: "splash_background",
      showSpinner: false             
    }
  }
};

export default config;
