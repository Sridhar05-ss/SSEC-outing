const axios = require('axios');

const baseURL = process.env.VITE_EASYTIMEPRO_API_URL || 'http://127.0.0.1:8081';

// Authenticate with Easy Time Pro
async function authenticate() {
  try {
    const res = await axios.post(`${baseURL}/api-token-auth/`, {
      username: 'admin',
      password: 'Admin123',
    });
    if (res.data.token) {
      console.log('Successfully authenticated with EasyTime Pro');
      return res.data.token;
    } else {
      throw new Error('Authentication failed, token not received.');
    }
  } catch (error) {
    console.error('Failed to authenticate with Easy Time Pro:', error.response ? error.response.data : error.message);
    throw new Error('Failed to authenticate with Easy Time Pro. Please check credentials and API availability.');
  }
}

// Create employee in Easy Time Pro
async function createEmployee(staffData) {
  const token = await authenticate();

  const res = await axios.post(`${baseURL}/personnel/api/employees/`, staffData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return res.data;
}

// Remove employee
async function removeEmployee(employeeId) {
  const token = await authenticate();

  const res = await axios.delete(`${baseURL}/personnel/api/employees/${employeeId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}

module.exports = {
  authenticate,
  createEmployee,
  removeEmployee,
};