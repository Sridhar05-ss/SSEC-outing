// ZKTeco Configuration
export const ZKTecoConfig = {
  // API Base URL - Update this to match your ZKTeco API server
  API_BASE_URL: import.meta.env.VITE_ZKTECO_API_URL || 'http://localhost:8000',
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication endpoints
    STAFF_AUTH: '/staff-api-token-auth/',
    JWT_AUTH: '/jwt-api-token-auth/',
    JWT_REFRESH: '/jwt-api-token-refresh/',
    
    // Device management endpoints
    DEVICE_STATUS: '/device-status/',
    SYNC: '/sync/',
    USERS: '/users/',
    ATTENDANCE: '/attendance/',
    LOGS: '/logs/',
  },
  
  // Device settings
  DEVICE: {
    SYNC_INTERVAL: 30000, // 30 seconds
    STATUS_CHECK_INTERVAL: 30000, // 30 seconds
    MAX_LOG_ENTRIES: 100,
    TIMEOUT: 10000, // 10 seconds
  },
  
  // User privilege levels
  PRIVILEGES: {
    USER: 0,
    ADMIN: 1,
    SUPER_ADMIN: 2,
  },
  
  // Attendance types
  ATTENDANCE_TYPES: {
    IN: 'in',
    OUT: 'out',
  },
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${ZKTecoConfig.API_BASE_URL}${endpoint}`;
};

// Helper function to get endpoint URL
export const getEndpoint = (endpointKey: keyof typeof ZKTecoConfig.ENDPOINTS): string => {
  return ZKTecoConfig.ENDPOINTS[endpointKey];
};

export default ZKTecoConfig; 