import React, { useState, useEffect } from 'react';
import { zktecoAuth } from '../lib/zktecoAuth';

interface DeviceStatusProps {
  className?: string;
}

const DeviceStatus: React.FC<DeviceStatusProps> = ({ className = '' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkDeviceStatus();
    // Check device status every 30 seconds
    const interval = setInterval(checkDeviceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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
        // Show success message
        console.log('Device synced successfully');
      } else {
        console.error('Device sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">ZKTeco Device Status</h3>
        <button
          onClick={checkDeviceStatus}
          disabled={isLoading}
          className="text-white/70 hover:text-white text-xs transition-colors"
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-2">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-xs">Connection:</span>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-xs">Last Sync:</span>
          <span className="text-white/60 text-xs">
            {formatLastSync(lastSync)}
          </span>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={!isConnected || isSyncing}
          className={`w-full mt-3 py-2 px-3 rounded text-xs font-medium transition-all ${
            isConnected && !isSyncing
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-500 text-gray-300 cursor-not-allowed'
          }`}
        >
          {isSyncing ? 'Syncing...' : 'Sync Device'}
        </button>
      </div>
    </div>
  );
};

export default DeviceStatus; 