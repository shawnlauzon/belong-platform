export * from './getMemberConnectionCode';
export * from './createConnectionRequest';
export * from './approveConnection';
export * from './rejectConnection';
export * from './fetchPendingConnections';
export * from './fetchUserConnections';
export * from './regenerateMemberCode';
export * from './fetchConnectionDetails';

// Legacy alias for integration tests
export { createConnectionRequest as processConnectionLink } from './createConnectionRequest';