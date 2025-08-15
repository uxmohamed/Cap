import "server-only";

// Placeholder exports to avoid compilation issues
export const getCurrentUser = () => Promise.resolve(null);
export const HttpAuthMiddlewareLive = {};
export const provideOptionalAuth = (app: any) => app;
export const Database = {};
export const Folders = {};
export const Videos = {};
export const RpcsLive = {};
export const RpcAuthMiddlewareLive = {};
