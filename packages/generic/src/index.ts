// @agentojs/generic — Generic REST API adapter for AI commerce agents

export { GenericRESTProvider } from './generic-rest-provider.js';
export { GenericProviderNotImplementedError } from './generic-rest-provider.js';
export { GenericFieldMapper, getField } from './generic-field-mapper.js';
export type {
  GenericEndpointsMap,
  GenericFieldMap,
  GenericRESTProviderConfig,
  GenericRESTBackendConfig,
} from './types.js';

// v0.3.0 — CommerceBackend implementation (alias)
export { GenericRESTBackend, GenericBackendNotImplementedError } from './generic-rest-backend.js';
