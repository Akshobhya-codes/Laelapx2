import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

/**
 * Catch-all route mounting Stack Auth's bundled UI:
 *   /handler/sign-in
 *   /handler/sign-up
 *   /handler/account-settings
 *   /handler/forgot-password
 *   /handler/email-verification
 *   /handler/oauth-callback
 *   /handler/sign-out
 *   ...etc.
 */
export default function Handler(props: {
  params: Promise<{ stack?: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
