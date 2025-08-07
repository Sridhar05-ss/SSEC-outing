// Easy Time Pro Staff Management Service
// This file exports functions for adding and deleting staff members in Easy Time Pro

import { easyTimeProAPI } from './easytimeproApi';
import { StaffData } from './easytimeproApi';

/**
 * Authenticate with Easy Time Pro
 * This function should be called before any staff management operations
 * 
 * @param username - The username for authentication
 * @param password - The password for authentication
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function authenticate(username: string = 'admin', password: string = 'Admin123'): Promise<boolean> {
  try {
    const credentials = { username, password };
    const response = await easyTimeProAPI.authenticate(credentials);
    
    if (response.token) {
      easyTimeProAPI.setToken(response.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to authenticate:', error);
    return false;
  }
}

/**
 * Add a new staff member to Easy Time Pro
 * This function should be called when "Add Staff" is clicked in the staff management of admin dashboard
 * 
 * @param staffData - The staff data to be added
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function addStaffMember(staffData: StaffData): Promise<boolean> {
  try {
    const result = await easyTimeProAPI.addStaffMember(staffData);
    return result;
  } catch (error) {
    console.error('Failed to add staff member:', error);
    return false;
  }
}

/**
 * Delete a staff member from Easy Time Pro
 * This function should be called when "Remove Staff" is clicked in the staff management of admin dashboard
 * 
 * @param staffId - The ID of the staff member to be deleted
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function deleteStaffMember(staffId: string): Promise<boolean> {
  try {
    const result = await easyTimeProAPI.deleteStaffMember(staffId);
    return result;
  } catch (error) {
    console.error('Failed to delete staff member:', error);
    return false;
  }
}

// Export the Easy Time Pro API instance as well for authentication purposes
export { easyTimeProAPI } from './easytimeproApi';

// Export types for use in components
export type { StaffData } from './easytimeproApi';