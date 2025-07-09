"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { collection, addDoc, doc, updateDoc, query, orderBy, onSnapshot, Timestamp, getDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, FileText, Clock, AlertCircle, CheckCircle, Settings, Edit3, Save, X } from "lucide-react"
import "./admin-logs.css"

interface LogEntry {
  id: string
  logId: string
  title: string
  affectedSection: string
  status: "failed" | "fixing" | "fixed"
  description: string
  timestamp: any
  createdBy: string
  createdByName?: string
  lastUpdated?: any
  lastUpdatedBy?: string
  lastUpdatedByName?: string
}

const AdminLogs = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    affectedSection: "",
    status: "fixing" as "failed" | "fixing" | "fixed",
    description: "",
  })
  const [submitting, setSubmitting] = useState(false)

  // Edit states
  const [editingLog, setEditingLog] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<LogEntry>>({})

  useEffect(() => {
    checkUserStatus()
    fetchLogs()
  }, [])

  const checkUserStatus = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      // Get user data for display purposes
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setCurrentUser({
          uid: user.uid,
          name: userData.fullName || userData.username || "User",
          email: userData.email || user.email,
        })
      } else {
        setCurrentUser({
          uid: user.uid,
          name: "User",
          email: user.email,
        })
      }
    } catch (error) {
      console.error("Error checking user status:", error)
      navigate("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = () => {
    const logsRef = collection(db, "maintenanceLogs")
    const q = query(logsRef, orderBy("timestamp", "desc"))

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const logsData: LogEntry[] = []

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data()

        // Get creator name
        let createdByName = "Unknown User"
        if (data.createdBy) {
          try {
            const creatorDoc = await getDoc(doc(db, "users", data.createdBy))
            if (creatorDoc.exists()) {
              const creatorData = creatorDoc.data()
              createdByName = creatorData.fullName || creatorData.username || "User"
            }
          } catch (error) {
            console.error("Error fetching creator data:", error)
          }
        }

        // Get last updater name
        let lastUpdatedByName = undefined
        if (data.lastUpdatedBy) {
          try {
            const updaterDoc = await getDoc(doc(db, "users", data.lastUpdatedBy))
            if (updaterDoc.exists()) {
              const updaterData = updaterDoc.data()
              lastUpdatedByName = updaterData.fullName || updaterData.username || "User"
            }
          } catch (error) {
            console.error("Error fetching updater data:", error)
          }
        }

        logsData.push({
          id: docSnapshot.id,
          logId: `LOG-${docSnapshot.id.substring(0, 8).toUpperCase()}`,
          createdByName,
          lastUpdatedByName,
          ...data,
        } as LogEntry)
      }

      setLogs(logsData)
    })

    return unsubscribe
  }

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.affectedSection || !formData.description) {
      alert("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      await addDoc(collection(db, "maintenanceLogs"), {
        title: formData.title,
        affectedSection: formData.affectedSection,
        status: formData.status,
        description: formData.description,
        timestamp: Timestamp.now(),
        createdBy: user.uid,
        lastUpdated: Timestamp.now(),
        lastUpdatedBy: user.uid,
      })

      // Reset form
      setFormData({
        title: "",
        affectedSection: "",
        status: "fixing",
        description: "",
      })
      setShowCreateForm(false)

      alert("Log created successfully!")
    } catch (error) {
      console.error("Error creating log:", error)
      alert("Error creating log. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditLog = (log: LogEntry) => {
    setEditingLog(log.id)
    setEditFormData({
      title: log.title,
      affectedSection: log.affectedSection,
      status: log.status,
      description: log.description,
    })
  }

  const handleUpdateLog = async (logId: string) => {
    if (!editFormData.title || !editFormData.affectedSection || !editFormData.description) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      const logRef = doc(db, "maintenanceLogs", logId)
      await updateDoc(logRef, {
        title: editFormData.title,
        affectedSection: editFormData.affectedSection,
        status: editFormData.status,
        description: editFormData.description,
        lastUpdated: Timestamp.now(),
        lastUpdatedBy: user.uid,
      })

      setEditingLog(null)
      setEditFormData({})
      alert("Log updated successfully!")
    } catch (error) {
      console.error("Error updating log:", error)
      alert("Error updating log. Please try again.")
    }
  }

  const cancelEdit = () => {
    setEditingLog(null)
    setEditFormData({})
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "failed":
        return <AlertCircle size={16} className="status-icon failed" />
      case "fixing":
        return <Settings size={16} className="status-icon fixing" />
      case "fixed":
        return <CheckCircle size={16} className="status-icon fixed" />
      default:
        return <Clock size={16} className="status-icon" />
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="admin-logs-loading">
        <div className="loading-spinner"></div>
        <p>Loading maintenance logs...</p>
      </div>
    )
  }

  return (
    <div className="admin-logs-container">
      <div className="admin-logs-content">
        {/* Header */}
        <div className="admin-logs-header">
          <button className="back-button" onClick={() => navigate("/maintenance")}>
            <ArrowLeft size={20} />
            Back to Maintenance
          </button>

          <div className="header-content">
            <div className="logs-icon">
              <FileText size={48} />
            </div>
            <h1 className="logs-title">Maintenance Logs</h1>
            <p className="logs-subtitle">Create and manage system maintenance logs</p>
            {currentUser && <p className="current-user">Logged in as: {currentUser.name}</p>}
          </div>

          <button className="create-log-button" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus size={20} />
            {showCreateForm ? "Cancel" : "Create New Log"}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="create-form-section">
            <form onSubmit={handleCreateLog} className="create-form">
              <h3>Create New Maintenance Log</h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title">Log Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Database Migration"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="affectedSection">Affected Section *</label>
                  <input
                    type="text"
                    id="affectedSection"
                    value={formData.affectedSection}
                    onChange={(e) => setFormData({ ...formData, affectedSection: e.target.value })}
                    placeholder="e.g., User Authentication, Payment System"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as "failed" | "fixing" | "fixed" })
                  }
                  required
                >
                  <option value="fixing">Fixing</option>
                  <option value="failed">Failed</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the maintenance activity..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="submit-button">
                  {submitting ? "Creating..." : "Create Log"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Logs List */}
        <div className="logs-list-section">
          <div className="section-header">
            <h2>Maintenance Logs ({logs.length})</h2>
          </div>

          {logs.length === 0 ? (
            <div className="no-logs">
              <FileText size={48} />
              <h3>No logs yet</h3>
              <p>Create your first maintenance log to get started.</p>
            </div>
          ) : (
            <div className="logs-grid">
              {logs.map((log) => (
                <div key={log.id} className={`log-card ${log.status}`}>
                  <div className="log-header">
                    <div className="log-id">
                      <span className="log-id-label">ID:</span>
                      <span className="log-id-value">{log.logId}</span>
                    </div>
                    <div className="log-status">
                      {getStatusIcon(log.status)}
                      <span className={`status-text ${log.status}`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {editingLog === log.id ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editFormData.title || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        className="edit-input"
                        placeholder="Log Title"
                      />
                      <input
                        type="text"
                        value={editFormData.affectedSection || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, affectedSection: e.target.value })}
                        className="edit-input"
                        placeholder="Affected Section"
                      />
                      <select
                        value={editFormData.status || "fixing"}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, status: e.target.value as "failed" | "fixing" | "fixed" })
                        }
                        className="edit-select"
                      >
                        <option value="fixing">Fixing</option>
                        <option value="failed">Failed</option>
                        <option value="fixed">Fixed</option>
                      </select>
                      <textarea
                        value={editFormData.description || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        className="edit-textarea"
                        rows={3}
                        placeholder="Description"
                      />
                      <div className="edit-actions">
                        <button onClick={() => handleUpdateLog(log.id)} className="save-button">
                          <Save size={16} />
                          Save
                        </button>
                        <button onClick={cancelEdit} className="cancel-edit-button">
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="log-content">
                      <h3 className="log-title">{log.title}</h3>
                      <p className="log-section">
                        <strong>Affected:</strong> {log.affectedSection}
                      </p>
                      <p className="log-description">{log.description}</p>

                      <div className="log-footer">
                        <div className="log-timestamps">
                          <span className="timestamp">
                            <Clock size={14} />
                            Created: {formatTimestamp(log.timestamp)}
                            {log.createdByName && <span className="user-name"> by {log.createdByName}</span>}
                          </span>
                          {log.lastUpdated && (
                            <span className="timestamp">
                              Updated: {formatTimestamp(log.lastUpdated)}
                              {log.lastUpdatedByName && <span className="user-name"> by {log.lastUpdatedByName}</span>}
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleEditLog(log)} className="edit-button">
                          <Edit3 size={16} />
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminLogs
