import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zktecoAuth } from "../lib/zktecoAuth";
import DeviceStatus from "../components/DeviceStatus";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const user = await zktecoAuth.authenticate(username, password);
      
      console.log('Authentication successful:', user);
      
      // Navigate based on user role
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "management") {
        navigate("/management");
      } else {
        navigate("/dashboard"); // Default fallback
      }
      
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0" 
           style={{
             backgroundImage: 'url(https://i.pinimg.com/1200x/06/46/06/064606d7bb91668ee0eac998d8e18139.jpg)',
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat',
             filter: 'blur(4px)',
           }}>
      </div>
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        {/* Login Card */}
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-8 text-center">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-8">SSEC LOGIN</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="relative">
              <div className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 rounded-md overflow-hidden">
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="w-full px-4 py-3 bg-transparent text-white placeholder-white/70 focus:outline-none"
                  placeholder="USERNAME"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                <div className="px-3">
                  <img src="/user-icon.svg" alt="User" className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 rounded-md overflow-hidden">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 bg-transparent text-white placeholder-white/70 focus:outline-none"
                  placeholder="PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="px-3 text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <img src="/key-icon.svg" alt="Password" className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/50 backdrop-blur-sm border border-red-300 rounded-lg p-3">
                <p className="text-white text-sm">{error}</p>
              </div>
            )}

            {/* Remember me checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-white focus:ring-white border-white/50 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-semibold py-3 px-4 rounded-md transition duration-200 transform hover:scale-[1.02] focus:outline-none ${
                isLoading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-100 text-gray-800'
              }`}
            >
              {isLoading ? 'AUTHENTICATING...' : 'SIGN IN'}
            </button>
          </form>

          {/* Device Status */}
          <div className="mt-6">
            <DeviceStatus />
          </div>

          {/* Demo Credentials Info */}
          <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <p className="text-white/80 text-xs text-center mb-2">
              <strong>Demo Credentials (for testing):</strong>
            </p>
            <div className="text-white/60 text-xs space-y-1">
              <p><strong>Admin:</strong> admin / admin123</p>
              <p><strong>Management:</strong> manager / manager123</p>
              <p><strong>Gate:</strong> gate / gate123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;