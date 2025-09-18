import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  // Public routes that don't require auth
  //@ts-ignore
  publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)", "/api/(.*)"]
});

export const config = {
  matcher: [
    // Protect everything except static files and _next
    "/((?!_next|.*\\..*).*)",
  ],
};
