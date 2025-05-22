"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { checkCurrentUserIsAdmin } from "../services/admin"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import { Search, UserCheck, AlertTriangle, CheckCircle, Loader2, XCircle, Calendar, User } from "lucide-react"
import Preloader from "../components/preloader"
import "./agent-onboard.css"

interface AgentInfo {
  isAgent: boolean
  agentId?: string
  addedAt?: Timestamp
  addedBy?: string
}

const AgentOnboard = () => {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [userUid, setUserUid] = useState("")
  const [searchingUser, setSearchingUser] = useState(false)
  const [searchedUser, setSearchedUser] = useState<any>(null)
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [processingAction, setProcessingAction] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const isAdmin = await checkCurrentUserIsAdmin()
        if (!isAdmin) {
          window.location.href = "/home"
          return
        }
        setLoading(false)
      } catch (error) {
        console.error("Error checking admin status:", error)
        setMessage({
          text: "Error checking permissions. Please try again.",
          type: "error",
        })
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  const searchUserByUid = async () => {
    if (!userUid.trim()) {
      setMessage({ text: "Please enter a user ID", type: "error" })
      return
    }

    setSearchingUser(true)
    setSearchedUser(null)
    setAgentInfo(null)

    try {
      // Get user details
      const userDocRef = doc(db, "users", userUid.trim())
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        setSearchedUser({
          uid: userDoc.id,
          email: userData.email || "No email",
          name: userData.fullName || userData.username || "Unknown",
        })

        // Check if user is already an agent
        if (userData.isAgent !== undefined) {
          setAgentInfo({
            isAgent: userData.isAgent,
            agentId: userData.agentId,
            addedAt: userData.agentAddedAt,
            addedBy: userData.agentAddedBy,
          })
        } else {
          setAgentInfo({
            isAgent: false,
          })
        }
      } else {
        setMessage({ text: "User not found", type: "error" })
      }
    } catch (error) {
      console.error("Error searching for user:", error)
      setMessage({ text: "Error searching for user", type: "error" })
    } finally {
      setSearchingUser(false)
    }
  }

  const generateAgentId = () => {
    // Generate 8 random numbers
    const numbers = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("")

    // Generate 2 random uppercase letters
    const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("")

    return `SPTA${numbers}${letters}`
  }

  const makeAgent = async () => {
    if (!searchedUser) {
      setMessage({ text: "Please search for a user first", type: "error" })
      return
    }

    setProcessingAction(true)

    try {
      const agentId = generateAgentId()
      const currentUser = auth.currentUser
      const timestamp = Timestamp.now()

      // Update user document
      const userDocRef = doc(db, "users", searchedUser.uid)
      await updateDoc(userDocRef, {
        isAgent: true,
        agentId: agentId,
        agentAddedAt: timestamp,
        agentAddedBy: currentUser?.uid || "Unknown",
      })

      // Send email notification
      const userDoc = await getDoc(userDocRef)
      const userData = userDoc.data()

      const response = await fetch("https://spotix-backend.onrender.com/api/notify/agent-onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userData?.email,
          name: userData?.fullName || userData?.username || "Valued Agent",
          agent_id: agentId,
          username: userData?.username || userData?.fullName || "Agent",
        }),
      })

      if (!response.ok) {
        console.error("Failed to send agent email:", await response.text())
      } else {
        console.log("Agent email sent successfully")
      }

      // Update local state
      setAgentInfo({
        isAgent: true,
        agentId: agentId,
        addedAt: timestamp,
        addedBy: currentUser?.uid || "Unknown",
      })

      setMessage({ text: "User successfully made an agent", type: "success" })
    } catch (error) {
      console.error("Error making user an agent:", error)
      setMessage({ text: "Failed to make user an agent", type: "error" })
    } finally {
      setProcessingAction(false)
    }
  }

  const revokeAgent = async () => {
    if (!searchedUser) {
      setMessage({ text: "Please search for a user first", type: "error" })
      return
    }

    setProcessingAction(true)

    try {
      // Update user document
      const userDocRef = doc(db, "users", searchedUser.uid)
      await updateDoc(userDocRef, {
        isAgent: false,
      })

      // Update local state
      setAgentInfo({
        ...agentInfo!,
        isAgent: false,
      })

      setMessage({ text: "Agent status successfully revoked", type: "success" })
    } catch (error) {
      console.error("Error revoking agent status:", error)
      setMessage({ text: "Failed to revoke agent status", type: "error" })
    } finally {
      setProcessingAction(false)
    }
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <UserHeader />
      <div className="agent-onboard-container">
        <div className="agent-header">
          <h1>Agent Management</h1>
          <div className="agent-header-actions">
            <button className="back-to-dashboard" onClick={() => (window.location.href = "/admin")}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`agent-message ${message.type}`}>
            {message.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            {message.text}
            <button onClick={() => setMessage({ text: "", type: "" })}>×</button>
          </div>
        )}

        <div className="search-user-section">
          <h2>
            <Search size={20} />
            Find User
          </h2>
          <div className="search-form">
            <div className="form-row">
              <div className="form-group">
                <label>User ID</label>
                <div className="search-input-container">
                  <input
                    type="text"
                    placeholder="Enter user UID"
                    value={userUid}
                    onChange={(e) => setUserUid(e.target.value)}
                  />
                  <button
                    className="search-user-btn"
                    onClick={searchUserByUid}
                    disabled={searchingUser || !userUid.trim()}
                  >
                    {searchingUser ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {searchedUser && (
          <div className="user-details-section">
            <h2>
              <User size={20} />
              User Details
            </h2>
            <div className="user-card">
              <div className="user-info">
                <h3>{searchedUser.name}</h3>
                <p className="user-email">{searchedUser.email}</p>
                <p className="user-id">UID: {searchedUser.uid}</p>
              </div>

              {agentInfo && (
                <div className="agent-status-container">
                  <div className="agent-status">
                    <h4>Agent Status</h4>
                    <div className={`status-badge ${agentInfo.isAgent ? "active" : "inactive"}`}>
                      {agentInfo.isAgent ? (
                        <>
                          <UserCheck size={16} />
                          Active Agent
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          Not an Agent
                        </>
                      )}
                    </div>
                  </div>

                  {agentInfo.isAgent && agentInfo.agentId && (
                    <div className="agent-details">
                      <div className="agent-id-display">
                        <span className="label">Agent ID:</span>
                        <span className="value">{agentInfo.agentId}</span>
                      </div>

                      {agentInfo.addedAt && (
                        <div className="agent-added-info">
                          <div className="added-date">
                            <Calendar size={14} />
                            <span>
                              Added on {new Date(agentInfo.addedAt.seconds * 1000).toLocaleDateString()} at{" "}
                              {new Date(agentInfo.addedAt.seconds * 1000).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="added-by">
                            <User size={14} />
                            <span>Added by {agentInfo.addedBy}</span>
                          </div>
                        </div>
                      )}

                      <button className="revoke-agent-btn" onClick={revokeAgent} disabled={processingAction}>
                        {processingAction ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle size={16} />
                            Revoke Agent Status
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {!agentInfo.isAgent && (
                    <div className="make-agent-action">
                      <p>This user is not currently an agent. Would you like to make them an agent?</p>
                      <button className="make-agent-btn" onClick={makeAgent} disabled={processingAction}>
                        {processingAction ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <UserCheck size={16} />
                            Make Agent
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default AgentOnboard
