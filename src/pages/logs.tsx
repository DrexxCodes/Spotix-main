"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "../services/firebase"
import { ArrowLeft, FileText, Clock, AlertCircle, CheckCircle, Settings, RefreshCw } from "lucide-react"
import "./logs.css"

interface LogEntry {
  id: string
  logId: string
  title: string
  affectedSection: string
  status: "failed" | "fixing" | "fixed"
  description: string
  timestamp: any
  lastUpdated?: any
}

const Logs: React.FC = () => {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = () => {
    const logsRef = collection(db, "maintenanceLogs")
    const q = query(logsRef, orderBy("timestamp", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: LogEntry[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        logsData.push({
          id: doc.id,
          logId: `LOG-${doc.id.substring(0, 8).toUpperCase()}`,
          ...data,
        } as LogEntry)
      })
      setLogs(logsData)
      setLoading(false)
      setLastUpdated(new Date())
    })

    return unsubscribe
  }

  const handleBackToMaintenance = () => {
    navigate("/maintenance")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "failed":
        return <AlertCircle size={20} className="status-icon failed" />
      case "fixing":
        return <Settings size={20} className="status-icon fixing" />
      case "fixed":
        return <CheckCircle size={20} className="status-icon fixed" />
      default:
        return <Clock size={20} className="status-icon" />
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString()
  }

  const getStatusCounts = () => {
    const counts = { failed: 0, fixing: 0, fixed: 0 }
    logs.forEach((log) => {
      counts[log.status]++
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="logs-container">
      <div className="logs-content">
        {/* Header */}
        <div className="logs-header">
          <button className="back-button" onClick={handleBackToMaintenance}>
            <ArrowLeft size={20} />
            Back to Maintenance
          </button>

          <div className="header-content">
            <div className="logs-icon">
              <FileText size={48} />
            </div>
            <h1 className="logs-title">Maintenance Logs</h1>
            <p className="logs-subtitle">Real-time updates on Spotix maintenance progress</p>
          </div>

          <div className="logs-stats">
            <div className="stat-item failed">
              <AlertCircle size={16} />
              <span>{statusCounts.failed} Failed</span>
            </div>
            <div className="stat-item fixing">
              <Settings size={16} />
              <span>{statusCounts.fixing} Fixing</span>
            </div>
            <div className="stat-item fix">
              <CheckCircle size={16} />
              <span>{statusCounts.fixed} Fixed</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="logs-main">
          {loading ? (
            <div className="loading-section">
              <div className="loading-spinner">
                <RefreshCw size={32} className="spin" />
              </div>
              <h2>Loading maintenance logs...</h2>
              <p>Please wait while we fetch the latest updates.</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="no-logs-section">
              <div className="no-logs-icon">
                <Clock size={64} />
              </div>
              <h2 className="no-logs-title">No maintenance logs yet</h2>
              <p className="no-logs-description">
                All systems are running smoothly. Maintenance logs will appear here when activities are in progress.
              </p>

              <div className="coming-soon-badge">
                <CheckCircle size={16} />
                <span>All Systems Operational</span>
              </div>
            </div>
          ) : (
            <div className="logs-list">
              <div className="logs-list-header">
                <h2>Current Maintenance Activities</h2>
                <div className="last-updated">
                  <Clock size={14} />
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="logs-timeline">
                {logs.map((log, index) => (
                  <div key={log.id} className={`log-entry ${log.status}`}>
                    <div className="log-timeline-marker">{getStatusIcon(log.status)}</div>

                    <div className="log-card">
                      <div className="log-card-header">
                        <div className="log-meta">
                          <span className="log-id">{log.logId}</span>
                          <span className={`log-status ${log.status}`}>
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </span>
                        </div>
                        <div className="log-timestamp">{formatTimestamp(log.timestamp)}</div>
                      </div>

                      <div className="log-card-content">
                        <h3 className="log-title">{log.title}</h3>
                        <p className="log-section">
                          <strong>Affected Section:</strong> {log.affectedSection}
                        </p>
                        <p className="log-description">{log.description}</p>

                        {log.lastUpdated && (
                          <div className="log-updated">
                            <Clock size={12} />
                            <span>Updated: {formatTimestamp(log.lastUpdated)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="logs-footer">
          <p>
            {logs.length > 0
              ? `Showing ${logs.length} maintenance ${logs.length === 1 ? "log" : "logs"} • Updates in real-time`
              : "Stay tuned for live maintenance updates"}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Logs
