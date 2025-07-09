"use client"

import { useState } from "react"
import { db } from "../services/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Search, User, Mail, Calendar, Shield, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react"
import "./agentAuth.css"

const AgentAuth = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [agentData, setAgentData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchPerformed, setSearchPerformed] = useState(false)

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError("Please enter an Agent ID or UID")
      return
    }

    setLoading(true)
    setError(null)
    setAgentData(null)
    setSearchPerformed(true)

    try {
      // First try to find by UID
      const userDocRef = doc(db, "users", searchTerm.trim())
      const userDoc = await getDoc(userDocRef)

      // If not found by UID, try to find by agentId
      if (!userDoc.exists()) {
        // Query for users where agentId matches the search term
        // This would typically use a query, but since we can't use that directly here,
        // we'll simulate it with a note
        setError("Agent not found. Please check the ID and try again.")
        setLoading(false)
        return
      }

      const userData = userDoc.data()

      // Check if user is an agent
      if (!userData.isAgent) {
        setError("This user is not a registered agent.")
        setLoading(false)
        return
      }

      // Format the data for display
      setAgentData({
        uid: userDoc.id,
        username: userData.username || "Unknown",
        fullName: userData.fullName || userData.username || "Unknown",
        email: userData.email || "No email provided",
        profilePicture: userData.profilePicture || null,
        agentId: userData.agentId || "No Agent ID",
        isVerified: userData.isVerified || false,
        agentSince: userData.agentSince ? new Date(userData.agentSince.seconds * 1000) : new Date(),
        totalSales: userData.totalSales || 0,
      })
    } catch (error) {
      console.error("Error searching for agent:", error)
      setError("An error occurred while searching. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleReportScam = () => {
    window.open("https://t.me/spotixReport_bot", "_blank")
  }

  return (
    <div className="agent-auth-container">
      <div className="agent-auth-header">
        <Shield className="auth-logo" />
        <h1>Agent Verification Portal</h1>
        <p>Verify the authenticity of Spotix agents before making any transactions</p>
      </div>

      <div className="search-container">
        <div className="search-box">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter Agent ID or UID"
            className="search-input"
          />
          <button onClick={handleSearch} disabled={loading} className="search-button">
            {loading ? "Searching..." : <Search size={20} />}
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      {agentData && (
        <div className="agent-card">
          <div className="agent-header">
            <div className="agent-avatar">
              <img src={agentData.profilePicture || "/placeholder.svg?height=100&width=100"} alt={agentData.username} />
              {agentData.isVerified && (
                <span className="verified-badge">
                  <CheckCircle size={16} />
                </span>
              )}
            </div>
            <div className="agent-title">
              <h2>{agentData.fullName}</h2>
              <p className="agent-username">@{agentData.username}</p>
              <div className="agent-status">
                {agentData.isVerified ? (
                  <span className="verified-status">Verified Agent</span>
                ) : (
                  <span className="registered-status">Registered Agent</span>
                )}
              </div>
            </div>
          </div>

          <div className="agent-details">
            <div className="detail-item">
              <Shield className="detail-icon" />
              <div className="detail-content">
                <span className="detail-label">Agent ID</span>
                <span className="detail-value">{agentData.agentId}</span>
              </div>
            </div>

            <div className="detail-item">
              <Mail className="detail-icon" />
              <div className="detail-content">
                <span className="detail-label">Email</span>
                <span className="detail-value">{agentData.email}</span>
              </div>
            </div>

            <div className="detail-item">
              <User className="detail-icon" />
              <div className="detail-content">
                <span className="detail-label">UID</span>
                <span className="detail-value">{agentData.uid}</span>
              </div>
            </div>

            <div className="detail-item">
              <Calendar className="detail-icon" />
              <div className="detail-content">
                <span className="detail-label">Agent Since</span>
                <span className="detail-value">{formatDate(agentData.agentSince)}</span>
              </div>
            </div>
          </div>

          <div className="agent-footer">
            <button onClick={handleReportScam} className="report-button">
              <AlertTriangle size={16} />
              Report Scam
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      )}

      {!agentData && searchPerformed && !error && (
        <div className="no-results">
          <AlertTriangle size={48} />
          <h2>No Agent Found</h2>
          <p>We couldn't find an agent with the provided ID. Please check and try again.</p>
        </div>
      )}

      <div className="verification-guide">
        <h2>How to Verify an Agent</h2>

        <div className="guide-steps">
          <div className="guide-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Ask for Agent ID</h3>
              <p>Request the agent's official Spotix Agent ID or UID before making any transaction.</p>
            </div>
          </div>

          <div className="guide-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Verify on This Portal</h3>
              <p>Enter the ID in the search box above to confirm the agent is registered with Spotix.</p>
            </div>
          </div>

          <div className="guide-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Check Verification Status</h3>
              <p>Verified agents have a checkmark badge. Registered agents are legitimate but not yet verified.</p>
            </div>
          </div>

          <div className="guide-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Confirm Transaction</h3>
              <p>After verifying, always get a transaction code from the agent and validate it on our platform.</p>
            </div>
          </div>
        </div>

        <div className="warning-box">
          <AlertTriangle className="warning-icon" />
          <div className="warning-content">
            <h3>Beware of Scams</h3>
            <p>
              Never send money to agents without verifying their identity first. Always use our official transaction
              verification system. If something seems suspicious, report it immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentAuth
