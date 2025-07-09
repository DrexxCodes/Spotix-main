"use client"

import type React from "react"
import { Suspense, lazy } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"

// Lazy load components
const Maintenance = lazy(() => import("./pages/maintenance"))
const Logs = lazy(() => import("./pages/logs"))
const AdminLogs = lazy(() => import("./pages/admin-logs"))

// Loading component
const LoadingSpinner: React.FC = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p className="loading-text">Loading...</p>
  </div>
)

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Maintenance page - main landing */}
            <Route path="/maintenance" element={<Maintenance />} />

            {/* Logs pages */}
            <Route path="/logs" element={<Logs />} />
            <Route path="/admin-logs" element={<AdminLogs />} />

          </Routes>
        </Suspense>
      </div>
    </Router>
  )
}

export default App
