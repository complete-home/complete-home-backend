import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export const env = {
  port: Number(process.env.PORT) || 4001,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || "25m",
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  seedAdminUserId: process.env.SEED_ADMIN_USER_ID || "USR41472786",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || "securepassword123",
  seedClientUserId: process.env.SEED_CLIENT_USER_ID || "CLTUSR2206",
  seedClientPassword: process.env.SEED_CLIENT_PASSWORD || "securepassword123",
  notifyEmailEnabled: process.env.NOTIFY_EMAIL_ENABLED === "true",
  notifySmsEnabled: process.env.NOTIFY_SMS_ENABLED === "true",
  appPublicUrl: process.env.APP_PUBLIC_URL || "http://localhost:5173",
};
