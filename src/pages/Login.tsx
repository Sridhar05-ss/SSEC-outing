import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fakeAuth } from "../lib/fakeAuth";

const demoUsers = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "manager", password: "manager123", role: "management" },
  { username: "gate", password: "gate123", role: "gate" },
];

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = demoUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      fakeAuth.isAuthenticated = true;
      fakeAuth.role = user.role as 'admin' | 'management' | 'gate';
      setError("");
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "management") navigate("/management");
      else if (user.role === "gate") navigate("/gate");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 font-poppins">
      <div className="w-full flex flex-col items-center justify-center">
        <div className="w-[35%] min-w-[320px] mx-auto mt-24">
          <img src="/college_logo.png" alt="College Logo" className="w-full max-w-full mx-auto mb-4 object-contain" />
          <div className="p-10 bg-white shadow-lg rounded-2xl text-center">
            <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800">Gate In Gate Out</h1>
            <form className="space-y-6" onSubmit={handleSubmit} autoComplete="on">
          <div>
                <label htmlFor="username" className="block text-blue-700 font-semibold mb-1 text-left">Username</label>
            <input
              id="username"
              name="username"
              type="text"
                  className="w-full border border-blue-700 rounded pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
                <label htmlFor="password" className="block text-blue-700 font-semibold mb-1 text-left">Password</label>
                <div className="relative w-full">
            <input
              id="password"
              name="password"
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-2 pr-10 rounded border border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
                  <span
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={0}
                    role="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <i className="fa-regular fa-eye-slash"></i>
                    ) : (
                      <i className="fa-regular fa-eye"></i>
                    )}
                  </span>
                </div>
          </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition">Login</button>
        </form>
        {error && <p className="text-red-600 text-center mt-4">{error}</p>}
            <p className="text-center text-sm text-blue-700 mt-4">Demo credentials:<br/>admin/admin123, manager/manager123, gate/gate123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 