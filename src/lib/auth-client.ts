import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  plugins: [twoFactorClient({ onTwoFactorRedirect: () => { if (typeof window !== "undefined") window.location.assign("/admin/two-factor"); } })],
});

export const { signIn, signOut, useSession } = authClient;
