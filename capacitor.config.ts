import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.withyou.pooping",
  appName: "WITHYOU",
  webDir: "dist",
  server: {
    url: "https://withyou-pooping-now.likeko.chatgpt.site",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: true,
    scheme: "WITHYOU",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#050505",
      showSpinner: false,
    },
    Haptics: {},
    Geolocation: {
      permissions: ["location"],
    },
    Camera: {
      permissions: ["camera", "photos"],
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
