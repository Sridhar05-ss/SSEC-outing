# ZKTeco Hardware Integration Setup Guide

This guide will help you integrate your ZKTeco attendance device with your SSEC website.

## Prerequisites

1. **ZKTeco Hardware Device** - Your attendance device (fingerprint scanner, card reader, etc.)
2. **ZKTeco Software** - The software that connects to your hardware device
3. **API Server** - A backend server that provides the API endpoints shown in the documentation

## Step 1: Hardware Setup

1. **Connect your ZKTeco device** to your computer via USB or network connection
2. **Install ZKTeco software** on your computer
3. **Configure the device** with your network settings
4. **Test the connection** to ensure the device is working properly

## Step 2: API Server Setup

You need a backend server that provides the following API endpoints:

### Authentication Endpoints
- `POST /staff-api-token-auth/` - Staff authentication
- `POST /jwt-api-token-auth/` - JWT authentication  
- `POST /jwt-api-token-refresh/` - JWT token refresh

### Device Management Endpoints
- `GET /device-status/` - Check device connection status
- `POST /sync/` - Sync data with device
- `GET /users/` - Get device users
- `POST /users/` - Add user to device
- `DELETE /users/{id}/` - Delete user from device
- `GET /attendance/` - Get attendance data
- `GET /logs/` - Get device logs

### Example API Response Formats

#### Authentication Response
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "name": "Administrator"
  }
}
```

#### Device Status Response
```json
{
  "isConnected": true,
  "deviceInfo": {
    "deviceName": "ZKTeco C3X",
    "serialNumber": "123456789",
    "firmwareVersion": "1.0.0"
  },
  "lastSync": "2024-01-15T10:30:00Z"
}
```

## Step 3: Environment Configuration

1. **Create a `.env` file** in your project root:

```env
# ZKTeco API Configuration
VITE_ZKTECO_API_URL=http://your-api-server-url:port

# Example:
# VITE_ZKTECO_API_URL=http://localhost:8000
# VITE_ZKTECO_API_URL=http://192.168.1.100:8000
```

2. **Update the API URL** to match your backend server address

## Step 4: Testing the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Check device status** on the login page
3. **Test authentication** with valid credentials
4. **Access ZKTeco Management** page (for admin users)

## Step 5: Production Deployment

1. **Set up your production API server**
2. **Update environment variables** for production
3. **Configure CORS** on your API server to allow your website domain
4. **Set up SSL certificates** for secure communication

## API Endpoint Details

### Authentication

#### Staff API Token Auth
```bash
POST /staff-api-token-auth/
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

#### JWT API Token Auth
```bash
POST /jwt-api-token-auth/
Content-Type: application/json

{
  "username": "your_username", 
  "password": "your_password"
}
```

#### JWT Token Refresh
```bash
POST /jwt-api-token-refresh/
Content-Type: application/json

{
  "refresh": "your_refresh_token"
}
```

### Device Management

#### Get Device Status
```bash
GET /device-status/
Authorization: Bearer your_access_token
```

#### Sync Device
```bash
POST /sync/
Authorization: Bearer your_access_token
```

#### Get Users
```bash
GET /users/
Authorization: Bearer your_access_token
```

#### Add User
```bash
POST /users/
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "user_id": "12345",
  "name": "John Doe",
  "privilege": 0,
  "password": "optional_password",
  "group_id": "optional_group",
  "user_rid": "optional_rid",
  "card": 123456
}
```

#### Delete User
```bash
DELETE /users/12345/
Authorization: Bearer your_access_token
```

#### Get Attendance Data
```bash
GET /attendance/?date=2024-01-15
Authorization: Bearer your_access_token
```

#### Get Device Logs
```bash
GET /logs/?limit=100
Authorization: Bearer your_access_token
```

## Troubleshooting

### Common Issues

1. **Device not connecting**
   - Check USB/network connection
   - Verify device IP address
   - Check firewall settings

2. **Authentication failing**
   - Verify API server is running
   - Check API endpoint URLs
   - Verify credentials are correct

3. **CORS errors**
   - Configure CORS on your API server
   - Add your website domain to allowed origins

4. **Token expiration**
   - Implement automatic token refresh
   - Check token expiration settings

### Debug Mode

Enable debug logging by adding to your `.env` file:
```env
VITE_DEBUG=true
```

## Security Considerations

1. **Use HTTPS** in production
2. **Implement proper authentication** on your API server
3. **Validate all input data**
4. **Use environment variables** for sensitive configuration
5. **Implement rate limiting** on your API endpoints
6. **Regular security updates** for your ZKTeco software

## Support

For ZKTeco hardware support, contact your device vendor or ZKTeco support.

For API integration issues, check the API documentation or contact your backend developer.

## Files Created/Modified

- `src/lib/zktecoApi.ts` - ZKTeco API service
- `src/lib/zktecoAuth.ts` - ZKTeco authentication service
- `src/components/DeviceStatus.tsx` - Device status component
- `src/pages/ZKTecoManagement.tsx` - Device management page
- `src/config/zkteco.ts` - Configuration file
- `src/pages/Login.tsx` - Updated login page
- `ZKTECO_SETUP.md` - This setup guide 