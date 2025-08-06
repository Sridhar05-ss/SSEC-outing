// ZKTeco API Integration Service
// Based on the API documentation provided

interface ZKTecoConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  access?: string;
  refresh?: string;
  token?: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

interface ZKTecoDeviceStatus {
  isConnected: boolean;
  deviceInfo?: {
    deviceName: string;
    serialNumber: string;
    firmwareVersion: string;
  };
  lastSync?: string;
}

class ZKTecoAPI {
  private config: ZKTecoConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: ZKTecoConfig) {
    this.config = {
      timeout: 10000,
      ...config,
    };
  }

  // Set tokens after successful authentication
  setTokens(access: string, refresh?: string) {
    this.accessToken = access;
    if (refresh) this.refreshToken = refresh;
  }

  // Clear tokens on logout
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Get authorization header
  private getAuthHeader(): Record<string, string> {
    if (this.accessToken) {
      return { Authorization: `Bearer ${this.accessToken}` };
    }
    return {};
  }

  // Make API request with error handling
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
      timeout: this.config.timeout,
    };

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('ZKTeco API request failed:', error);
      throw error;
    }
  }

  // Staff API Token Authentication
  async authenticateStaff(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest('/staff-api-token-auth/', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (response.token) {
        this.accessToken = response.token;
      }

      return response;
    } catch (error) {
      console.error('Staff authentication failed:', error);
      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  // JWT API Token Authentication
  async authenticateJWT(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest('/jwt-api-token-auth/', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (response.access && response.refresh) {
        this.setTokens(response.access, response.refresh);
      }

      return response;
    } catch (error) {
      console.error('JWT authentication failed:', error);
      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  // Refresh JWT Token
  async refreshToken(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.makeRequest('/jwt-api-token-refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh: this.refreshToken }),
      });

      if (response.access) {
        this.accessToken = response.access;
      }

      return response;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }

  // Get device status
  async getDeviceStatus(): Promise<ZKTecoDeviceStatus> {
    try {
      const response = await this.makeRequest('/device-status/', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Failed to get device status:', error);
      return { isConnected: false };
    }
  }

  // Get attendance data
  async getAttendanceData(date?: string): Promise<any[]> {
    try {
      const params = date ? `?date=${date}` : '';
      const response = await this.makeRequest(`/attendance/${params}`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Failed to get attendance data:', error);
      throw new Error('Failed to fetch attendance data');
    }
  }

  // Sync with device
  async syncDevice(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/sync/', {
        method: 'POST',
      });
      return response.success || false;
    } catch (error) {
      console.error('Device sync failed:', error);
      return false;
    }
  }

  // Get user list from device
  async getDeviceUsers(): Promise<any[]> {
    try {
      const response = await this.makeRequest('/users/', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Failed to get device users:', error);
      throw new Error('Failed to fetch device users');
    }
  }

  // Add user to device
  async addUserToDevice(userData: {
    user_id: string;
    name: string;
    privilege: number;
    password?: string;
    group_id?: string;
    user_rid?: string;
    card?: number;
  }): Promise<boolean> {
    try {
      const response = await this.makeRequest('/users/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response.success || false;
    } catch (error) {
      console.error('Failed to add user to device:', error);
      return false;
    }
  }

  // Delete user from device
  async deleteUserFromDevice(userId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/users/${userId}/`, {
        method: 'DELETE',
      });
      return response.success || false;
    } catch (error) {
      console.error('Failed to delete user from device:', error);
      return false;
    }
  }

  // Get device logs
  async getDeviceLogs(limit: number = 100): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/logs/?limit=${limit}`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Failed to get device logs:', error);
      throw new Error('Failed to fetch device logs');
    }
  }
}

import ZKTecoConfig, { getApiUrl, getEndpoint } from '../config/zkteco';

// Create and export a singleton instance
export const zktecoAPI = new ZKTecoAPI({
  baseUrl: ZKTecoConfig.API_BASE_URL,
  timeout: ZKTecoConfig.DEVICE.TIMEOUT,
});

export default ZKTecoAPI; 