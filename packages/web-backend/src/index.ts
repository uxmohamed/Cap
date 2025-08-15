import "server-only";

// Placeholder exports to avoid compilation issues
export const getCurrentUser = () => Promise.resolve(null);
export const HttpAuthMiddlewareLive = {};
export const provideOptionalAuth = (app: any) => app;

// Database exports
export const Database = {
  Default: {},
  execute: () => Promise.resolve(null)
};
export const DatabaseError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
};

// Folders exports
export const Folders = {
  Default: {},
  delete: () => Promise.resolve(null)
};

// Videos exports
export const Videos = {
  Default: {},
  getById: () => Promise.resolve(null),
  delete: () => Promise.resolve(null),
  duplicate: () => Promise.resolve(null)
};

// RPC exports
export const RpcsLive = {};
export const RpcAuthMiddlewareLive = {};
