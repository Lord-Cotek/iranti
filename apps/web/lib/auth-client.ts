import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { API_URL } from "./config";

/** Better Auth client: emailed codes and passkeys. Sessions are httpOnly cookies on the API. */
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: { credentials: "include" },
  plugins: [emailOTPClient(), passkeyClient()],
});
