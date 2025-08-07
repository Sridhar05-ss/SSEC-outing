// Easy Time Pro API Integration Service
// This file handles authentication and staff management functions for Easy Time Pro

import EasyTimeProConfig, { getApiUrl, getEndpoint } from '../config/easytimepro';

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

interface AuthResponseData {
  token: string;
}

interface StaffResponse {
  success: boolean;
  [key: string]: string | number | boolean | object | null | undefined;
}

interface StaffData {
  name: string;
  user_id: string;
  privilege: number;
  password?: string;
  group_id?: string;
  user_rid?: string;
  card?: number;
  // Allow additional properties
  // Index signature allowing additional properties
  [key: string]: string | number | boolean | undefined;
}

class EasyTimeProAPI {
  private backendBaseUrl = 'http://localhost:3001/api';
  private accessToken: string | null = null;

  // Set token after successful authentication
  setToken(token: string) {
    this.accessToken = token;
  }

  // Clear token on logout
  clearToken() {
    this.accessToken = null;
  }

  // Make API request with error handling
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.backendBaseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data as T;
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        return text as unknown as T;
      }
    } catch (error) {
      console.error('Backend API request failed:', error);
      throw error;
    }
  }

  // Authenticate with backend server
  async authenticate(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthResponseData>('/authenticate', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (response.token) {
        this.accessToken = response.token;
      }

      return {
        token: response.token,
        user: undefined
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  // Add a new staff member
  async addStaffMember(staffData: StaffData): Promise<boolean> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }
      const response = await this.makeRequest<StaffResponse>('/employees', {
        method: 'POST',
        body: JSON.stringify(staffData),
      });
      
      return response.success || false;
    } catch (error) {
      console.error('Failed to add staff member:', error);
      return false;
    }
  }

  // Delete a staff member
  async deleteStaffMember(staffId: string): Promise<boolean> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }
      const response = await this.makeRequest<StaffResponse>(`/employees/${staffId}`, {
        method: 'DELETE',
      });
      
      return response.success || false;
    } catch (error) {
      console.error('Failed to delete staff member:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const easyTimeProAPI = new EasyTimeProAPI();

export default EasyTimeProAPI;
export { easyTimeProAPI };
export type { StaffData, AuthResponse };