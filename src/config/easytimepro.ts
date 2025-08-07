// EasyTime Pro Configuration
export const EasyTimeProConfig = {
  // API Base URL - Update this to match your EasyTime Pro API server
  API_BASE_URL: import.meta.env.VITE_EASYTIMEPRO_API_URL || 'http://127.0.0.1:8081',
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication endpoints
    AUTH: '/api-token-auth/',
    STAFF_JWT_AUTH: '/staff-jwt-api-token-auth/',
    
    // Staff management endpoints
    PERSONAL: '/personnel/api/employees/',

    // Transaction Logs
    TRANSACTIONS: '/iclock/api/transactions/',
  },
  
  // Device settings
// ... existing code ...

  
  // Device settings
  DEVICE: {
    TIMEOUT: 10000, // 10 seconds
  },
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${EasyTimeProConfig.API_BASE_URL}${endpoint}`;
};

// Helper function to get endpoint URL
export const getEndpoint = (endpointKey: keyof typeof EasyTimeProConfig.ENDPOINTS): string => {
  return EasyTimeProConfig.ENDPOINTS[endpointKey];
};

export default EasyTimeProConfig;