// client/src/App.js - UPDATED WITH GPS TRACKER ROUTE
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import DashboardView from "./components/DashboardView";
import BuildingView from "./components/BuildingView";
import BuildingAssetsPage from "./pages/BuildingAssetsPage";
import AssetDetailsPage from "./pages/AssetDetailsPage";
import GpsTrackerPage from "./pages/GpsTrackerPage";

// Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("authToken");
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* 🔐 Login Page - First screen */}
        <Route path="/login" element={<LoginPage />} />

        {/* 🏠 Main Dashboard - Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardView />
            </ProtectedRoute>
          }
        />

        {/* 🏢 Building selection - Protected */}
        <Route
          path="/building/:id"
          element={
            <ProtectedRoute>
              <BuildingView />
            </ProtectedRoute>
          }
        />

        {/* 📦 Assets inside building - Protected */}
        <Route
          path="/building/:buildingName/assets"
          element={
            <ProtectedRoute>
              <BuildingAssetsPage />
            </ProtectedRoute>
          }
        />

        {/* 📋 Asset Full Details Page - Protected */}
        <Route
          path="/asset/:assetId"
          element={
            <ProtectedRoute>
              <AssetDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* 📍 GPS Tracker Page - For mobile devices to track assets */}
        { <Route
          path="/gps-tracker"
          element={
            <ProtectedRoute>
              <GpsTrackerPage />
            </ProtectedRoute>
          }
        /> }

        {/* Default redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;