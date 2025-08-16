import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/(?!webhooks)(.*)',
]);

export default clerkMiddleware((auth, req) => {
  console.log("🔧 Middleware called for:", req.url);
  console.log("🔧 Auth object:", { userId: auth().userId, has: !!auth().userId });
  
  if (isProtectedRoute(req)) {
    console.log("🔧 Protected route detected");
    const { userId } = auth();
    if (!userId) {
      console.log("🔧 No userId, would redirect to login");
      // Don't actually redirect here, let the pages handle it
      // to avoid middleware redirect loops
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
