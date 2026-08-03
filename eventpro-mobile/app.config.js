// Expo loads .env when this file exists; EXPO_PUBLIC_* vars are embedded at build time.
// Local dev on a physical device: EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8080
const base = require("./app.json").expo;
module.exports = {
  expo: {
    ...base,
    extra: {
      ...base.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || base.extra?.apiUrl || "http://localhost:8080",
      webUrl: process.env.EXPO_PUBLIC_WEB_URL || base.extra?.webUrl || "http://localhost:5173",
    },
  },
};
