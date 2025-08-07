import { zktecoAPI } from './zktecoApi';
import { validateDemoCredentials, DemoUser } from './demoCredentials';

// Helper function to convert DemoUser to ZKTecoUser
const convertDemoUserToZKTecoUser = (demoUser: DemoUser): ZKTecoUser => {
  // Generate a numeric ID from the user_id string
  const id = demoUser.user_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return {
    id,
    username: demoUser.username,
    role: demoUser.role,
    name: demoUser.name,
    user_id: demoUser.user_id,
    privilege: demoUser.privilege,
  };
};
interface ZKTecoUser {
  id: number;
  username: string;
  role: 'admin' | 'management' | 'staff';
  name: string;
  user_id: string;
  privilege: number;
}

interface ZKTecoAuthState {
  isAuthenticated: boolean;
  user: ZKTecoUser | null;
  tokens: {
    access: string | null;
    refresh: string | null;
  };
  deviceStatus: {
    isConnected: boolean;
    lastSync: string | null;
  };
}

interface ZKTecoAttendanceRecord {
  user_id: string;
  timestamp: string;
  status: 'in' | 'out';
  device_id?: string;
}

interface ZKTecoDeviceUser {
  user_id: string;
  name: string;
  privilege: number;
  password?: string;
  group_id?: string;
  user_rid?: string;
  card?: number;
}

interface ZKTecoDeviceLog {
  id: string;
  timestamp: string;
  operation: string;
  details?: string;
}

// Helper functions to get/set ZKTeco auth state from localStorage
const getZKTecoAuthState = (): ZKTecoAuthState => {
  try {
    const stored = localStorage.getItem('zktecoAuthState');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading ZKTeco auth state from localStorage:', error);
  }
  return {
    isAuthenticated: false,
    user: null,
    tokens: { access: null, refresh: null },
    deviceStatus: { isConnected: false, lastSync: null },
  };
};

const setZKTecoAuthState = (state: ZKTecoAuthState) => {
  try {
    localStorage.setItem('zktecoAuthState', JSON.stringify(state));
  } catch (error) {
    console.error('Error writing ZKTeco auth state to localStorage:', error);
  }
};

class ZKTecoAuth {
  private state: ZKTecoAuthState = getZKTecoAuthState();

  constructor() {
    // Initialize tokens if they exist
    if (this.state.tokens.access) {
      zktecoAPI.setTokens(this.state.tokens.access, this.state.tokens.refresh);
    }
  }

  get isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  get user(): ZKTecoUser | null {
    return this.state.user;
  }

  get deviceStatus() {
    return this.state.deviceStatus;
  }

  // Authenticate with ZKTeco device
  async authenticate(username: string, password: string): Promise<ZKTecoUser> {
    try {
      // Try JWT authentication first
      const response = await zktecoAPI.authenticateJWT({ username, password });
      
      if (response.access && response.refresh && response.user) {
        // Update state
        this.state = {
          isAuthenticated: true,
          user: response.user as unknown as ZKTecoUser,
          tokens: {
            access: response.access,
            refresh: response.refresh,
          },
          deviceStatus: this.state.deviceStatus,
        };

        // Set tokens in API
        zktecoAPI.setTokens(response.access, response.refresh);
        
        // Save to localStorage
        setZKTecoAuthState(this.state);

        return response.user as unknown as ZKTecoUser;
      }

      throw new Error('Invalid response from authentication server');
    } catch (error) {
      // If JWT auth fails, try staff token auth
      try {
        const staffResponse = await zktecoAPI.authenticateStaff({ username, password });
        
        if (staffResponse.token && staffResponse.user) {
          // Update state
          this.state = {
            isAuthenticated: true,
            user: staffResponse.user as unknown as ZKTecoUser,
            tokens: {
              access: staffResponse.token,
              refresh: null,
            },
            deviceStatus: this.state.deviceStatus,
          };

          // Set token in API
          zktecoAPI.setTokens(staffResponse.token);
          
          // Save to localStorage
          setZKTecoAuthState(this.state);

          return staffResponse.user as unknown as ZKTecoUser;
        }
      } catch (staffError) {
        console.error('Staff authentication also failed:', staffError);
      }

      // If ZKTeco API fails, try demo credentials as fallback
      const demoUser = validateDemoCredentials(username, password);
      if (demoUser) {
        console.log('Using demo credentials for testing:', demoUser);
        this.state = {
          isAuthenticated: true,
          user: convertDemoUserToZKTecoUser(demoUser),
          tokens: {
            access: 'demo-token',
            refresh: null,
          },
          deviceStatus: this.state.deviceStatus,
        };
        
        setZKTecoAuthState(this.state);
        console.log('Auth state updated:', this.state);
        return convertDemoUserToZKTecoUser(demoUser);
      }

      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  // Refresh authentication token
  async refreshAuth(): Promise<boolean> {
    if (!this.state.tokens.refresh) {
      return false;
    }

    try {
      const response = await zktecoAPI.refreshToken();
      
      if (response.access) {
        this.state.tokens.access = response.access;
        zktecoAPI.setTokens(response.access, this.state.tokens.refresh);
        setZKTecoAuthState(this.state);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }

    return false;
  }

  // Check device connection status
  async checkDeviceStatus(): Promise<boolean> {
    try {
      const status = await zktecoAPI.getDeviceStatus();
      this.state.deviceStatus = {
        isConnected: status.isConnected,
        lastSync: status.lastSync || null,
      };
      setZKTecoAuthState(this.state);
      return status.isConnected;
    } catch (error) {
      console.error('Failed to check device status:', error);
      this.state.deviceStatus.isConnected = false;
      setZKTecoAuthState(this.state);
      return false;
    }
  }

  // Sync with device
  async syncDevice(): Promise<boolean> {
    try {
      const success = await zktecoAPI.syncDevice();
      if (success) {
        this.state.deviceStatus.lastSync = new Date().toISOString();
        setZKTecoAuthState(this.state);
      }
      return success;
    } catch (error) {
      console.error('Device sync failed:', error);
      return false;
    }
  }

  // Get attendance data
  async getAttendanceData(date?: string): Promise<ZKTecoAttendanceRecord[]> {
    return await zktecoAPI.getAttendanceData(date);
  }

  // Get device users
  async getDeviceUsers(): Promise<ZKTecoDeviceUser[]> {
    return await zktecoAPI.getDeviceUsers();
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
    return await zktecoAPI.addUserToDevice(userData);
  }

  // Delete user from device
  async deleteUserFromDevice(userId: string): Promise<boolean> {
    return await zktecoAPI.deleteUserFromDevice(userId);
  }

  // Get device logs
  async getDeviceLogs(limit: number = 100): Promise<ZKTecoDeviceLog[]> {
    return await zktecoAPI.getDeviceLogs(limit);
  }

  // Logout
  logout(): void {
    this.state = {
      isAuthenticated: false,
      user: null,
      tokens: { access: null, refresh: null },
      deviceStatus: { isConnected: false, lastSync: null },
    };
    
    zktecoAPI.clearTokens();
    localStorage.removeItem('zktecoAuthState');
  }

  // Check if token is expired and refresh if needed
  async ensureValidToken(): Promise<boolean> {
    if (!this.state.isAuthenticated) {
      return false;
    }

    // Simple check - you might want to implement proper JWT expiration checking
    if (this.state.tokens.access) {
      return true;
    }

    return await this.refreshAuth();
  }
}

// Create and export singleton instance
export const zktecoAuth = new ZKTecoAuth();

// Export types for use in components
export type { ZKTecoUser, ZKTecoAuthState, ZKTecoAttendanceRecord, ZKTecoDeviceUser, ZKTecoDeviceLog };

export default ZKTecoAuth; 