// client/src/components/LoginPage.js - Staff Login Only
import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, AlertCircle, Eye, EyeOff, Building2, Sparkles, ArrowRight, Shield, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const navigate = useNavigate();

  // Staff demo credentials
  const staffCredentials = {
    email: "s.shimizu@spring8.or.jp",
    demoUser: "shimizu",
    demoPass: "shimizu123"
  };

  useEffect(() => {
    setMounted(true);
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!userId.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, password, role: "staff" }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard");
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Connection error. Please check if the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const isMobile = windowWidth < 768;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Static Background - No animations */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Static Gradient Orbs */}
        <div className="absolute -top-20 sm:-top-40 -left-20 sm:-left-40 w-48 h-48 sm:w-96 sm:h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 sm:-bottom-40 -right-20 sm:-right-40 w-48 h-48 sm:w-96 sm:h-96 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-96 sm:h-96 bg-violet-500/10 rounded-full blur-3xl" />

        {/* Subtle Grid Pattern - Static */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,.04)_1px,transparent_1px)] bg-[size:50px_50px] sm:bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 flex items-center justify-center gap-6 lg:gap-12 flex-col lg:flex-row">
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : -50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 text-center lg:text-left space-y-4 sm:space-y-6 max-w-xl"
        >
          {/* Logo - Static gradient */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
            className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-indigo-500 via-blue-500 to-violet-500 rounded-2xl sm:rounded-3xl shadow-2xl mx-auto lg:mx-0 relative"
          >
            <Building2 className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white relative z-10" />
            <div className="absolute inset-0 border-2 sm:border-4 border-white/20 border-t-white/60 rounded-2xl sm:rounded-3xl" />
          </motion.div>

          {/* Title */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-2 sm:mb-4 leading-tight"
            >
              <span className="bg-gradient-to-r from-indigo-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                SPring-8
              </span>
              <br />
              <span className="text-white">Inventory</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-base sm:text-lg lg:text-xl text-gray-300 font-light"
            >
              Next-Generation Asset Management
            </motion.p>
          </div>

          {/* Mobile Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex md:hidden justify-center gap-6"
          >
            {[Zap, Shield, Sparkles].map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="w-12 h-12 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 flex items-center justify-center"
              >
                <Icon className="w-5 h-5 text-indigo-300" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : 50 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Glassmorphism Card - No glow */}
          <div className="relative">
            {/* Static border accent */}
            <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500 rounded-2xl sm:rounded-3xl opacity-20" />
            
            {/* Card */}
            <div className="relative bg-white/10 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 border border-white/20 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.5 }}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-500/20 rounded-full border border-indigo-400/30 mb-3 sm:mb-4"
                >
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-300" />
                  <span className="text-xs sm:text-sm text-indigo-200 font-medium">Welcome Back</span>
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Sign In</h2>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Error Message */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3"
                    >
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-300 flex-shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-red-200">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* User ID Input */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-200 ml-1">
                    User ID
                  </label>
                  <div className="relative group">
                    <div className="relative flex items-center">
                      <div className="absolute left-3 sm:left-4 z-10">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-indigo-300 transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter your user ID"
                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-white border border-gray-300 rounded-xl sm:rounded-2xl text-gray-900 font-medium text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all group-hover:border-gray-400"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-200 ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="relative flex items-center">
                      <div className="absolute left-3 sm:left-4 z-10">
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-indigo-300 transition-colors" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-white border border-gray-300 rounded-xl sm:rounded-2xl text-gray-900 font-medium text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all group-hover:border-gray-400"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 sm:right-4 text-gray-300 hover:text-black transition-colors z-10"
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Button - Static gradient */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="relative w-full group overflow-hidden"
                >
                  {/* Stable gradient button */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500 rounded-xl sm:rounded-2xl" />
                  <motion.div
                    animate={{
                      x: loading ? ["-100%", "100%"] : "0%",
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: loading ? Infinity : 0,
                      ease: "linear",
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                  
                  {/* Button Content */}
                  <div className="relative flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-4 sm:px-6">
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span className="text-white font-bold text-base sm:text-lg">Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-white font-bold text-base sm:text-lg">Sign In</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </>
                    )}
                  </div>
                </motion.button>
              </form>

              {/* Demo Credentials */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6 sm:mt-8"
              >
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-300" />
                    <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Demo Credentials
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 mb-1 text-[10px] sm:text-xs">User ID</p>
                      <p className="text-white font-mono font-bold bg-white/5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-white/10 text-xs sm:text-sm">
                        {staffCredentials.demoUser}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1 text-[10px] sm:text-xs">Password</p>
                      <p className="text-white font-mono font-bold bg-white/5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-white/10 text-xs sm:text-sm">
                        {staffCredentials.demoPass}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-3 sm:bottom-6 left-0 right-0 text-center px-4"
      >
        <p className="text-gray-400 text-xs sm:text-sm">
          Protected by <span className="text-white font-semibold">SPring-8 Security</span>
        </p>
      </motion.div>
    </div>
  );
}