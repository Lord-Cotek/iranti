import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins/email-otp";
import { allowedOrigins } from "./cors";
import { db } from "./db";
import { env, relaxedRateLimits, signupAllowed } from "./env";
import { otpMail, sendMail } from "./mail";

function createAuth() {
  const e = env();
  if (!e.AUTH_SECRET) throw new Error("AUTH_SECRET is not set");
  const web = new URL(e.WEB_ORIGIN);
  const relax = relaxedRateLimits() ? 100 : 1;
  return betterAuth({
    appName: "Ìrántí",
    baseURL: e.AUTH_URL,
    basePath: "/api/auth",
    secret: e.AUTH_SECRET,
    database: prismaAdapter(db(), { provider: "postgresql" }),
    trustedOrigins: [...allowedOrigins()],
    telemetry: { enabled: false },
    // No passwords: sign-in is an emailed code or a passkey (BUILD.md §16 Phase 1).
    emailAndPassword: { enabled: false },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/email-otp/send-verification-otp": { window: 600, max: 5 * relax },
        "/sign-in/email-otp": { window: 600, max: 10 * relax },
        "/passkey/*": { window: 60, max: 30 },
      },
    },
    advanced: {
      useSecureCookies: e.AUTH_URL.startsWith("https://"),
      defaultCookieAttributes: { sameSite: "lax", httpOnly: true },
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            if (!signupAllowed(user.email)) {
              throw new APIError("FORBIDDEN", { message: "Ìrántí is not open for sign-up yet." });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp }) {
          // Pre-launch: only existing accounts and allowlisted addresses get a code. The
          // response is the same either way, so the allowlist is not revealed.
          if (!signupAllowed(email)) {
            const exists = await db().user.findUnique({
              where: { email: email.toLowerCase() },
              select: { id: true },
            });
            if (!exists) return;
          }
          await sendMail(otpMail(email, otp));
        },
      }),
      passkey({
        rpID: web.hostname,
        rpName: "Ìrántí",
        origin: [e.WEB_ORIGIN],
        authenticatorSelection: { residentKey: "required", userVerification: "required" },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { auth?: Auth };

export function auth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}
