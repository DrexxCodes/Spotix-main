"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { checkCurrentUserIsAdmin } from "../services/admin"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { Search, AlertCircle, CheckCircle, User, Wallet, DollarSign, Loader2, Tag, X } from "lucide-react"
import "./agent-funding.css"

const AgentFunding = () => {
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [fundingLoading, setFundingLoading] = useState(false)
  const [agentUid, setAgentUid] = useState("")
  const [fundAmount, setFundAmount] = useState("")
  const [agentData, setAgentData] = useState<any>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [adminData, setAdminData] = useState<any>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [fundingComplete, setFundingComplete] = useState(false)

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
        email: userData.email || "",
      })
    } catch (error) {
      console.error("Error searching for agent:", error)
      setError("Error searching for agent. Please try again.")
    } finally {
      setSearchLoading(false)
    }
  }

  const validateFundAmount = (): boolean => {
    if (!fundAmount.trim()) {
      setError("Please enter an amount to fund")
      return false
    }

    const amount = Number.parseFloat(fundAmount)
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid positive amount")
      return false
    }

    return true
  }

  const handleFundWallet = async () => {
    if (!agentData) {
      setError("Please search for an agent first")
      return
    }

    if (!validateFundAmount()) {
      return
    }

    setFundingLoading(true)
    setError("")
    setSuccess("")

    try {
      const amount = Number.parseFloat(fundAmount)

      // Start the funding animation
      await new Promise((resolve) => setTimeout(resolve, 8000)) // 8 seconds animation

      // Update agent's wallet
      const userDocRef = doc(db, "users", agentData.uid)
      const currentWallet = agentData.agentWallet || 0
      const newWalletBalance = currentWallet + amount

      await updateDoc(userDocRef, {
        agentWallet: newWalletBalance,
      })

      // Record the funding transaction
      const fundingCollectionRef = collection(db, "users", agentData.uid, "transactions", "funding", "records")
      await addDoc(fundingCollectionRef, {
        amount,
        date: serverTimestamp(),
        adminUid: adminData.uid,
        adminName: adminData.name,
        previousBalance: currentWallet,
        newBalance: newWalletBalance,
      })

      // Update local agent data
      setAgentData({
        ...agentData,
        agentWallet: newWalletBalance,
      })

      setFundingComplete(true)
      setShowSuccessDialog(true)
    } catch (error) {
      console.error("Error funding agent wallet:", error)
      setError("Error funding agent wallet. Please try again.")
    } finally {
      setFundingLoading(false)
    }
  }

  const closeSuccessDialog = () => {
    setShowSuccessDialog(false)
    setFundAmount("")
  }

  const resetForm = () => {
    setAgentUid("")
    setFundAmount("")
    setAgentData(null)
    setError("")
    setSuccess("")
    setFundingComplete(false)
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <UserHeader />
      <div className="agent-funding-container">
        <div className="agent-funding-header">
          <h1>Agent Wallet Funding</h1>
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
                  <span className="label">Current Wallet Balance:</span>
                  <span className="value wallet-balance">
                    <Wallet size={14} />₦{agentData.agentWallet.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="funding-section">
                <h3>Fund Agent Wallet</h3>

                <div className="form-group">
                  <label htmlFor="fund-amount">
                    <DollarSign size={16} />
                    Amount to Fund (₦)
                  </label>
                  <input
                    type="number"
                    id="fund-amount"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    step="0.01"
                    disabled={fundingLoading}
                  />
                </div>

                <button
                  className="fund-button"
                  onClick={handleFundWallet}
                  disabled={fundingLoading || !fundAmount.trim()}
                >
                  {fundingLoading ? (
                    <div className="funding-animation">
                      <div className="funding-progress">
                        <div className="funding-progress-bar"></div>
                      </div>
                      <span>Processing Funding...</span>
                    </div>
                  ) : (
                    <>
                      <Wallet size={16} />
                      Fund Wallet
                    </>
                  )}
                </button>
              </div>
            </div>

            <button className="reset-button" onClick={resetForm} disabled={fundingLoading}>
              Search Another Agent
            </button>
          </div>
        )}

        {showSuccessDialog && (
          <div className="success-dialog-overlay">
            <div className="success-dialog">
              <div className="success-dialog-header">
                <CheckCircle size={40} className="success-icon" />
                <h3>Funding Successful!</h3>
                <button className="close-dialog-btn" onClick={closeSuccessDialog}>
                  <X size={20} />
                </button>
              </div>
              <div className="success-dialog-content">
                <p>
                  Successfully funded Agent {agentData.name}, a sum of ₦{Number.parseFloat(fundAmount).toFixed(2)}.
                </p>
                <div className="funding-details">
                  <div className="funding-detail-row">
                    <span>Previous Balance:</span>
                    <span>₦{(agentData.agentWallet - Number.parseFloat(fundAmount)).toFixed(2)}</span>
                  </div>
                  <div className="funding-detail-row">
                    <span>Amount Added:</span>
                    <span className="amount-added">+₦{Number.parseFloat(fundAmount).toFixed(2)}</span>
                  </div>
                  <div className="funding-detail-row new-balance">
                    <span>New Balance:</span>
                    <span>₦{agentData.agentWallet.toFixed(2)}</span>
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

export default AgentFunding
