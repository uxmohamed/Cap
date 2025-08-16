import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware((auth, req) => {
  try {
    console.log("🔧 Middleware called for:", req.url);
    
    const authData = auth();
    console.log("🔧 Auth data:", { 
      hasUserId: !!authData.userId, 
      userId: authData.userId || "none",
      sessionId: authData.sessionId || "none"
    });
    
    // Check if this is a protected route
    const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
    const isApiRoute = req.nextUrl.pathname.startsWith('/api') && 
                      !req.nextUrl.pathname.startsWith('/api/webhooks');
    
    if (isDashboard || isApiRoute) {
      console.log("🔧 Protected route detected:", req.nextUrl.pathname);
      
      if (!authData.userId) {
        console.log("🔧 No userId in protected route");
      } else {
        console.log("🔧 User authenticated in middleware:", authData.userId);
      }
    }
  } catch (error) {
    console.error("❌ Middleware error:", error);
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
