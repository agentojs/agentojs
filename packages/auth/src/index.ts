// @agentojs/auth — Lightweight API key utilities

export { generateApiKey } from './key-generator.js';
export { hashApiKey, compareApiKey } from './key-hasher.js';
export { validateApiKey } from './key-validator.js';
export { createAuthMiddleware } from './middleware.js';
export type {
  ApiKey,
  ApiKeyValidation,
  AuthMiddlewareOptions,
  AuthenticatedRequest,
} from './types.js';
