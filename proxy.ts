import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes where unauthenticated access is allowed
const isPublicRoute = createRouteMatcher([
  "/",
  "/models(.*)",
  "/threads/(.*)",
  "/api/chat(.*)",
  "/api/models(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (_auth, req) => {
  // Routes are open for public viewing by default per scope.md (e.g. public thread viewing)
  if (isPublicRoute(req)) {
    return;
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
