import "server-only";
import { StackServerApp } from "@stackframe/stack";

/**
 * Server-side Stack Auth app instance. Reads:
 *   NEXT_PUBLIC_STACK_PROJECT_ID
 *   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
 *   STACK_SECRET_SERVER_KEY
 * automatically from process.env.
 */
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    // Land everyone on the role chooser after sign-in/up.
    // /welcome inspects the user's role and forwards to /founder or /funder.
    afterSignIn: "/welcome",
    afterSignUp: "/welcome",
    afterSignOut: "/",
    home: "/welcome",
  },
});
