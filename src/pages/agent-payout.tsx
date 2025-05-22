"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { checkCurrentUserIsAdmin } from "../services/admin"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { Search, AlertCircle, CheckCircle, User, Wallet, DollarSign, Loader2, Tag, X, Shield } from "lucide-react"
import "./agent-payout.css"

const AgentPayout = () => {
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [agentUid, setAgentUid] = useState("")
  const [payoutAmount, setPayoutAmount] = useState("")
  const [agentData, setAgentData] = useState<any>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [adminData, setAdminData] = useState<any>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [payoutComplete, setPayoutComplete] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const isAdmin = await checkCurrentUserIsAdmin()
        if (!isAdmin) {
          window.location.href = "/home"
          return
        }

        // Get admin data
        const user = auth.currentUser
        if (user) {
          const userDocRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userDocRef)
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setAdminData({
              uid: user.uid,
              name: userData.fullName || userData.username || "Admin",
            })
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking admin status:", error)
        setError("Error checking admin status. Please try again.")
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  const handleSearch = async () => {
    if (!agentUid.trim()) {
      setError("Please enter an Agent UID")
      return
    }

    setSearchLoading(true)
    setError("")
    setAgentData(null)

    try {
      // Check if the user exists and is an agent
      const userDocRef = doc(db, "users", agentUid.trim())
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        setError("User not found. Please check the UID.")
        setSearchLoading(false)
        return
      }

      const userData = userDoc.data()
      if (!userData.isAgent) {
        setError("This user is not an agent. Please check the UID.")
        setSearchLoading(false)
        return
      }

      setAgentData({
        uid: agentUid.trim(),
        name: userData.fullName || userData.username || "Agent",
        agentId: userData.agentId || "UNKNOWN",
        agentWallet: userData.agentWallet || 0,
        agentGain: userData.agentGain || 0,
        email: userData.email || "",
      })
    } catch (error) {
      console.error("Error searching for agent:", error)
      setError("Error searching for agent. Please try again.")
    } finally {
      setSearchLoading(false)
    }
  }

  const validatePayoutAmount = (): boolean => {
    if (!payoutAmount.trim()) {
      setError("Please enter an amount to withdraw")
      return false
    }

    const amount = Number.parseFloat(payoutAmount)
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid positive amount")
      return false
    }

    if (amount > agentData.agentGain) {
      setError("Withdrawal amount cannot exceed agent's earnings")
      return false
    }

    return true
  }

  const generateReference = () => {
    const letters = Math.random().toString(36).substring(2, 8).toUpperCase()
    const numbers = Math.floor(1000 + Math.random() * 9000).toString()
    return `SPTX-PO-${letters}${numbers}`
  }

  const handleProcessPayout = async () => {
    if (!agentData) {
      setError("Please search for an agent first")
      return
    }

    if (!validatePayoutAmount()) {
      return
    }

    setPayoutLoading(true)
    setError("")
    setSuccess("")

    try {
      const amount = Number.parseFloat(payoutAmount)
      const reference = generateReference()

      // Start the payout animation
      await new Promise((resolve) => setTimeout(resolve, 8000)) // 8 seconds animation

      // Update agent's earnings
      const userDocRef = doc(db, "users", agentData.uid)
      const currentEarnings = agentData.agentGain || 0
      const newEarningsBalance = currentEarnings - amount

      await updateDoc(userDocRef, {
        agentGain: newEarningsBalance,
      })

      // Record the payout transaction
      const payoutsCollectionRef = collection(db, "users", agentData.uid, "transactions", "payouts", "records")
      await addDoc(payoutsCollectionRef, {
        amount,
        date: serverTimestamp(),
        adminUid: adminData.uid,
        adminName: adminData.name,
        previousBalance: currentEarnings,
        newBalance: newEarningsBalance,
        reference,
      })

      // Update local agent data
      setAgentData({
        ...agentData,
        agentGain: newEarningsBalance,
      })

      setPayoutComplete(true)
      setShowSuccessDialog(true)
    } catch (error) {
      console.error("Error processing agent payout:", error)
      setError("Error processing agent payout. Please try again.")
    } finally {
      setPayoutLoading(false)
    }
  }

  const closeSuccessDialog = () => {
    setShowSuccessDialog(false)
    setPayoutAmount("")
  }

  const resetForm = () => {
    setAgentUid("")
    setPayoutAmount("")
    setAgentData(null)
    setError("")
    setSuccess("")
    setPayoutComplete(false)
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <UserHeader />
      <div className="agent-payout-container">
        <div className="agent-payout-header">
          <h1>Agent Earnings Payout</h1>
          {adminData && (
            <div className="admin-info">
              <div className="admin-name">
                <User size={16} />
                <span>Admin: {adminData.name}</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="success-message">
            <CheckCircle size={18} />
            <p>{success}</p>
          </div>
        )}

        <div className="search-section">
          <h2>Find Agent</h2>
          <p>Enter the Agent's UID to search</p>

          <div className="search-form">
            <div className="form-group">
              <label htmlFor="agent-uid">Agent UID</label>
              <input
                type="text"
                id="agent-uid"
                value={agentUid}
                onChange={(e) => setAgentUid(e.target.value)}
                placeholder="Enter agent's UID"
                disabled={searchLoading}
              />
            </div>

            <button className="search-button" onClick={handleSearch} disabled={searchLoading || !agentUid.trim()}>
              {searchLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Search Agent
                </>
              )}
            </button>
          </div>
        </div>

        {agentData && (
          <div className="agent-details-section">
            <h2>Agent Details</h2>

            <div className="agent-card">
              <div className="agent-info-row">
                <div className="agent-info-item">
                  <span className="label">Name:</span>
                  <span className="value">{agentData.name}</span>
                </div>
                <div className="agent-info-item">
                  <span className="label">Email:</span>
                  <span className="value">{agentData.email}</span>
                </div>
              </div>

              <div className="agent-info-row">
                <div className="agent-info-item">
                  <span className="label">Agent ID:</span>
                  <span className="value agent-id">
                    <Tag size={14} />
                    {agentData.agentId}
                  </span>
                </div>
                <div className="agent-info-item">
                  <span className="label">Available Earnings:</span>
                  <span className="value earnings-balance">
                    <DollarSign size={14} />₦{agentData.agentGain.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="payout-section">
                <h3>Process Earnings Withdrawal</h3>

                <div className="form-group">
                  <label htmlFor="payout-amount">
                    <DollarSign size={16} />
                    Withdrawal Amount (₦)
                  </label>
                  <input
                    type="number"
                    id="payout-amount"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    max={agentData.agentGain}
                    step="0.01"
                    disabled={payoutLoading}
                  />
                </div>

                <button
                  className="payout-button"
                  onClick={handleProcessPayout}
                  disabled={payoutLoading || !payoutAmount.trim()}
                >
                  {payoutLoading ? (
                    <div className="payout-animation">
                      <div className="payout-progress">
                        <div className="payout-progress-bar"></div>
                      </div>
                      <span>Processing Withdrawal...</span>
                      <div className="security-badge">
                        <Shield size={12} />
                        <span>Secured by Spotix IWSS</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Wallet size={16} />
                      Process Withdrawal
                    </>
                  )}
                </button>
              </div>
            </div>

            <button className="reset-button" onClick={resetForm} disabled={payoutLoading}>
              Search Another Agent
            </button>
          </div>
        )}

        {showSuccessDialog && (
          <div className="success-dialog-overlay">
            <div className="success-dialog">
              <div className="success-dialog-header">
                <CheckCircle size={40} className="success-icon" />
                <h3>Payout Successful!</h3>
                <button className="close-dialog-btn" onClick={closeSuccessDialog}>
                  <X size={20} />
                </button>
              </div>
              <div className="success-dialog-content">
                <p>
                  Successfully processed withdrawal for Agent {agentData.name}, a sum of ₦
                  {Number.parseFloat(payoutAmount).toFixed(2)}.
                </p>
                <div className="payout-details">
                  <div className="payout-detail-row">
                    <span>Previous Balance:</span>
                    <span>₦{(agentData.agentGain + Number.parseFloat(payoutAmount)).toFixed(2)}</span>
                  </div>
                  <div className="payout-detail-row">
                    <span>Amount Withdrawn:</span>
                    <span className="amount-withdrawn">-₦{Number.parseFloat(payoutAmount).toFixed(2)}</span>
                  </div>
                  <div className="payout-detail-row new-balance">
                    <span>New Balance:</span>
                    <span>₦{agentData.agentGain.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="success-dialog-actions">
                <button className="confirm-button" onClick={closeSuccessDialog}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default AgentPayout
