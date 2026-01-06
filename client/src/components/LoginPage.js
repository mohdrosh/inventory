import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, AlertCircle, Eye, EyeOff, Building2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const staffCredentials = {
    demoUser: "shimizu",
    demoPass: "shimizu123"
  };

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
        headers: { "Content-Type": "application/json" },
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
      setError("Connection error. Please check your server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      {/* Top Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">SPring-8</h1>
        <p className="text-2xl text-slate-700 font-medium">在庫管理</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-15xl shadow-slate-500/50 border border-slate-400 overflow-hidden">
          <div className="p-8">
            <h2 className="text-3xl font-semibold text-slate-800 mb-6">サインイン</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-3 text-red-600 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User ID */}
              <div className="space-y-1.5">
                <label className="text-2xl font-semibold text-slate-700 ml-1">ユーザーID</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="IDを入力してください"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-400 rounded-xl outline-none transition-all text-slate-900 placeholder-slate-400"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-2xl font-semibold text-slate-700 ml-1">パスワード</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-400 rounded-xl outline-none transition-all text-slate-900 placeholder-slate-400"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="text-2xl w-full bg-white border border-slate-400 text-black font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>サインイン</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Demo Helper */}
          <div className="bg-slate-50 border-t border-slate-100 p-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Demo Access:</span>
              <div className="flex gap-2">
                <code className="bg-white border border-slate-200 px-2 py-1 rounded text-indigo-600 font-bold lowercase tracking-wider">
                  {staffCredentials.demoUser}
                </code>
                <code className="bg-white border border-slate-200 px-2 py-1 rounded text-indigo-600 font-bold lowercase tracking-wider">
                  {staffCredentials.demoPass}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <p className="mt-8 text-center text-slate-400 text-sm">
          &copy; 2025 SPring-8 セキュリティサービス。無断複写・転載を禁じます。
        </p>
      </div>
    </div>
  );
}