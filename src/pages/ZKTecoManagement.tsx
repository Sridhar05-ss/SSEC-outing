import React, { useState, useEffect } from 'react';
import { zktecoAuth } from '../lib/zktecoAuth';

interface DeviceUser {
  user_id: string;
  name: string;
  privilege: number;
  group_id?: string;
  user_rid?: string;
  card?: number;
}

interface AttendanceRecord {
  user_id: string;
  name: string;
  timestamp: string;
  type: 'in' | 'out';
}

const ZKTecoManagement: React.FC = () => {
  const [deviceUsers, setDeviceUsers] = useState<DeviceUser[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [deviceLogs, setDeviceLogs] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // New user form state
  const [newUser, setNewUser] = useState({
    user_id: '',
    name: '',
    privilege: 0,
    password: '',
    group_id: '',
    user_rid: '',
    card: 0
  });

  useEffect(() => {
    loadDeviceData();
    checkDeviceStatus();
  }, []);

  const loadDeviceData = async () => {
    setIsLoading(true);
    try {
      // Load device users
      const users = await zktecoAuth.getDeviceUsers();
      setDeviceUsers(users);

      // Load attendance data
      const attendance = await zktecoAuth.getAttendanceData(selectedDate);
      setAttendanceData(attendance);

      // Load device logs
      const logs = await zktecoAuth.getDeviceLogs(50);
      setDeviceLogs(logs);
    } catch (error) {
      console.error('Failed to load device data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDeviceStatus = async () => {
    try {
      const connected = await zktecoAuth.checkDeviceStatus();
      setIsConnected(connected);
      setLastSync(zktecoAuth.deviceStatus.lastSync);
    } catch (error) {
      console.error('Failed to check device status:', error);
      setIsConnected(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const success = await zktecoAuth.syncDevice();
      if (success) {
        setLastSync(new Date().toISOString());
        await loadDeviceData(); // Reload data after sync
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await zktecoAuth.addUserToDevice(newUser);
      if (success) {
        setNewUser({
          user_id: '',
          name: '',
          privilege: 0,
          password: '',
          group_id: '',
          user_rid: '',
          card: 0
        });
        await loadDeviceData(); // Reload users
      }
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(`Are you sure you want to delete user ${userId}?`)) {
      try {
        const success = await zktecoAuth.deleteUserFromDevice(userId);
        if (success) {
          await loadDeviceData(); // Reload users
        }
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ZKTeco Device Management</h1>
              <p className="text-gray-600">Manage your ZKTeco attendance device</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <button
                onClick={handleSync}
                disabled={!isConnected || isSyncing}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isConnected && !isSyncing
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSyncing ? 'Syncing...' : 'Sync Device'}
              </button>
            </div>
          </div>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-2">
              Last sync: {formatTimestamp(lastSync)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Users */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Device Users</h2>
              <button
                onClick={loadDeviceData}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {deviceUsers.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">ID: {user.user_id}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user.user_id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New User */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <input
                    type="text"
                    value={newUser.user_id}
                    onChange={(e) => setNewUser({ ...newUser, user_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Privilege</label>
                  <select
                    value={newUser.privilege}
                    onChange={(e) => setNewUser({ ...newUser, privilege: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>User</option>
                    <option value={1}>Admin</option>
                    <option value={2}>Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
              >
                Add User
              </button>
            </form>
          </div>
        </div>

        {/* Attendance Data */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Attendance Data</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.map((record, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(record.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.type.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Logs</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {deviceLogs.map((log, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-900">{log.message || JSON.stringify(log)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {log.timestamp ? formatTimestamp(log.timestamp) : 'No timestamp'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZKTecoManagement; 