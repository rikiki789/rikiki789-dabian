import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.withyou.pooping",
  appName: "P∞P",
  webDir: "dist",
  server: {
    url: "https://withyou-pooping-now.likeko.chatgpt.site",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: true,
    scheme: "POOP",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#fbfbf9",
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
