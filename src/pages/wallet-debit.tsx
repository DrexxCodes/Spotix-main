"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { ArrowLeft, Search, Loader2, UserCheck, AlertCircle, CheckCircle, MinusCircle } from "lucide-react"
// import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { checkCurrentUserIsAdmin } from "../services/admin"
import "boxicons/css/boxicons.min.css"
import "../styles/payment-override.css"

interface UserData {
  uid: string
  email?: string
  fullName?: string
  username?: string
  wallet?: number
}

type ChargeType =
  | "Ad payment"
  | "Themed Event Payment"
  | "Featured Event Payment"
  | "Featured + Theme payment"
  | "Spotix Ad API"
  | "Spotix Event API"
  | "Charge Back"
  | "Special Event Page"
  | "Event Image design"
  | "Other"

const WalletDebit = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [debitAmount, setDebitAmount] = useState("")
  const [searchingUser, setSearchingUser] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [debitingInProgress, setDebitingInProgress] = useState(false)
  const [debitSuccess, setDebitSuccess] = useState(false)
  const [adminName, setAdminName] = useState("")
  const [chargeType, setChargeType] = useState<ChargeType>("Ad payment")
  const [customChargeType, setCustomChargeType] = useState("")
  const [chargeDescription, setChargeDescription] = useState("")

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const isAdmin = await checkCurrentUserIsAdmin()
        if (!isAdmin) {
          navigate("/home")
          return
        }

        // Get admin name
        const currentUser = auth.currentUser
        if (currentUser) {
          const adminDocRef = doc(db, "admins", currentUser.uid)
          const adminDoc = await getDoc(adminDocRef)

          if (adminDoc.exists()) {
            const adminData = adminDoc.data()
            setAdminName(adminData.name || currentUser.displayName || "Admin")
          } else {
            setAdminName(currentUser.displayName || "Admin")
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking admin status:", error)
        navigate("/home")
      }
    }

    checkAdminStatus()
  }, [navigate])

  const handleGoBack = () => {
    navigate(-1)
  }

  const searchUser = async () => {
    if (!userId.trim()) {
      setMessage({ text: "Please enter a user ID", type: "error" })
      return
    }

    setSearchingUser(true)
    setUserData(null)
    setMessage({ text: "", type: "" })

    try {
      const userDocRef = doc(db, "users", userId.trim())
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData({
          uid: userDoc.id,
          email: data.email || "No email",
          fullName: data.fullName || data.username || "Unknown",
          wallet: data.wallet || 0,
        })
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

  const handleDebitWallet = async () => {
    if (!userData) {
      setMessage({ text: "Please search for a user first", type: "error" })
      return
    }

    if (!debitAmount || isNaN(Number(debitAmount)) || Number(debitAmount) <= 0) {
      setMessage({ text: "Please enter a valid amount", type: "error" })
      return
    }

    if (chargeType === "Other" && !customChargeType.trim()) {
      setMessage({ text: "Please specify the custom charge type", type: "error" })
      return
    }

    const amount = Number(debitAmount)

    // Check if user has sufficient funds
    if (userData.wallet && userData.wallet < amount) {
      setMessage({
        text: `Insufficient funds. User only has NGN ${formatNumber(userData.wallet)} in their wallet.`,
        type: "error",
      })
      return
    }

    setDebitingInProgress(true)
    setMessage({ text: "", type: "" })

    try {
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw new Error("Admin not authenticated")
      }

      // Generate transaction ID with the same pattern as in wallet history
      const generateTransactionId = () => {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 9)
        return `wallet-debit-${timestamp}-${random}`
      }

      const transactionId = generateTransactionId()
      const now = new Date()
      const transactionDate = now.toLocaleDateString()
      const transactionTime = now.toLocaleTimeString()

      // Get current wallet balance
      const userDocRef = doc(db, "users", userData.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        throw new Error("User no longer exists")
      }

      const currentWalletBalance = userDoc.data().wallet || 0

      if (currentWalletBalance < amount) {
        setMessage({
          text: `Insufficient funds. User only has NGN ${formatNumber(currentWalletBalance)} in their wallet.`,
          type: "error",
        })
        setDebitingInProgress(false)
        return
      }

      const newWalletBalance = currentWalletBalance - amount

      // Create wallet-pay entry
      const walletPayCollectionRef = collection(db, "users", userData.uid, "wallet-pay")
      await addDoc(walletPayCollectionRef, {
        transactionId,
        transactionDate,
        transactionTime,
        transactionType: chargeType === "Other" ? customChargeType : chargeType,
        description: chargeDescription || `Wallet debit for ${chargeType === "Other" ? customChargeType : chargeType}`,
        amount,
        tag: "debit",
        status: "completed",
        adminId: currentUser.uid,
        adminName: adminName,
        createdAt: serverTimestamp(),
        previousBalance: currentWalletBalance,
        newBalance: newWalletBalance,
        userEmail: userData.email,
        userFullName: userData.fullName,
      })

      // Update user's wallet balance
      await updateDoc(userDocRef, {
        wallet: newWalletBalance,
      })

      // Update local user data
      setUserData({
        ...userData,
        wallet: newWalletBalance,
      })

      setDebitSuccess(true)
      setMessage({
        text: `Successfully debited NGN ${formatNumber(amount)} from ${userData.fullName}'s wallet for ${
          chargeType === "Other" ? customChargeType : chargeType
        }`,
        type: "success",
      })
    } catch (error) {
      console.error("Error debiting wallet:", error)
      setMessage({
        text: `Failed to debit wallet: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setDebitingInProgress(false)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const resetForm = () => {
    setUserId("")
    setDebitAmount("")
    setUserData(null)
    setDebitSuccess(false)
    setMessage({ text: "", type: "" })
    setChargeType("Ad payment")
    setCustomChargeType("")
    setChargeDescription("")
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <Helmet>
        <title>Debit User Wallet - Admin Suite - Spotix</title>
        <meta name="description" content="Debit funds from user wallets in the Spotix admin suite." />
      </Helmet>
      {/* <UserHeader /> */}
      <div className="wallet-debit-container">
        <div className="wallet-debit-header">
          <div className="header-top">
            <button className="back-button" onClick={handleGoBack}>
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Debit User Wallet</h1>
          </div>
        </div>

        {message.text && (
          <div className={`message-container ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle size={20} className="message-icon" />
            ) : (
              <AlertCircle size={20} className="message-icon" />
            )}
            <p>{message.text}</p>
            <button className="close-message" onClick={() => setMessage({ text: "", type: "" })}>
              ×
            </button>
          </div>
        )}

        <div className="wallet-debit-content">
          <div className="search-user-section">
            <h2>Search User</h2>
            <div className="search-form">
              <div className="input-group">
                <label htmlFor="userId">User ID</label>
                <div className="search-input-container">
                  <input
                    type="text"
                    id="userId"
                    placeholder="Enter user ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    disabled={searchingUser || debitSuccess}
                  />
                  <button
                    className="search-button"
                    onClick={searchUser}
                    disabled={searchingUser || !userId.trim() || debitSuccess}
                  >
                    {searchingUser ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>

          {userData && (
            <div className="user-details-section">
              <h2>User Details</h2>
              <div className="user-card">
                <div className="user-info">
                  <div className="user-avatar">
                    <UserCheck size={32} />
                  </div>
                  <div className="user-data">
                    <h3>{userData.fullName}</h3>
                    <p className="user-email">{userData.email}</p>
                    <p className="user-id">ID: {userData.uid}</p>
                  </div>
                </div>
                <div className="wallet-balance">
                  <span className="balance-label">Current Wallet Balance:</span>
                  <span className="balance-amount">NGN {formatNumber(userData.wallet || 0)}</span>
                </div>
              </div>

              <div className="debit-wallet-section">
                <h2>Debit Wallet</h2>
                <div className="debit-form">
                  <div className="input-group">
                    <label htmlFor="chargeType">Charge Type</label>
                    <select
                      id="chargeType"
                      value={chargeType}
                      onChange={(e) => setChargeType(e.target.value as ChargeType)}
                      disabled={debitingInProgress || debitSuccess}
                      className="charge-type-select"
                    >
                      <option value="Ad payment">Ad payment</option>
                      <option value="Themed Event Payment">Themed Event Payment</option>
                      <option value="Featured Event Payment">Featured Event Payment</option>
                      <option value="Featured + Theme payment">Featured + Theme payment</option>
                      <option value="Spotix Ad API">Spotix Ad API</option>
                      <option value="Spotix Event API">Spotix Event API</option>
                      <option value="Charge Back">Charge Back</option>
                      <option value="Special Event Page">Special Event Page</option>
                      <option value="Event Image design">Event Image design</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {chargeType === "Other" && (
                    <div className="input-group">
                      <label htmlFor="customChargeType">Specify Charge Type</label>
                      <input
                        type="text"
                        id="customChargeType"
                        placeholder="Enter custom charge type"
                        value={customChargeType}
                        onChange={(e) => setCustomChargeType(e.target.value)}
                        disabled={debitingInProgress || debitSuccess}
                      />
                    </div>
                  )}

                  <div className="input-group">
                    <label htmlFor="chargeDescription">Description (Optional)</label>
                    <textarea
                      id="chargeDescription"
                      placeholder="Enter additional details about this charge"
                      value={chargeDescription}
                      onChange={(e) => setChargeDescription(e.target.value)}
                      disabled={debitingInProgress || debitSuccess}
                      rows={3}
                      className="charge-description"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="debitAmount">Amount to Debit (NGN)</label>
                    <input
                      type="number"
                      id="debitAmount"
                      placeholder="Enter amount to debit"
                      value={debitAmount}
                      onChange={(e) => setDebitAmount(e.target.value)}
                      disabled={debitingInProgress || debitSuccess}
                    />
                  </div>

                  <div className="debit-actions">
                    {debitSuccess ? (
                      <button className="new-transaction-btn" onClick={resetForm}>
                        New Transaction
                      </button>
                    ) : (
                      <button
                        className="debit-button"
                        onClick={handleDebitWallet}
                        disabled={
                          debitingInProgress ||
                          !debitAmount ||
                          isNaN(Number(debitAmount)) ||
                          Number(debitAmount) <= 0 ||
                          (chargeType === "Other" && !customChargeType.trim())
                        }
                      >
                        {debitingInProgress ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <MinusCircle size={18} />
                            Debit Wallet
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />

      <style>{`
        .wallet-debit-container {
          min-height: 100vh;
          background-color: #f8f9fa;
          padding: 2rem 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .wallet-debit-header {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 1px solid #ddd;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-button:hover {
          background-color: #f5f5f5;
        }

        .wallet-debit-header h1 {
          margin: 0;
          color: #333;
          font-size: 2rem;
          font-weight: 600;
        }

        .message-container {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          position: relative;
        }

        .message-container.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message-container.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .message-icon {
          margin-right: 0.75rem;
          flex-shrink: 0;
        }

        .message-container p {
          margin: 0;
          flex-grow: 1;
        }

        .close-message {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: inherit;
          padding: 0 0.5rem;
        }

        .wallet-debit-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .search-user-section h2,
        .user-details-section h2,
        .debit-wallet-section h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .search-form {
          max-width: 600px;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #555;
        }

        .search-input-container {
          display: flex;
          gap: 0.5rem;
        }

        .search-input-container input {
          flex-grow: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }

        .search-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #6b2fa5;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .search-button:hover:not(:disabled) {
          background: #5a2589;
        }

        .search-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .user-details-section {
          margin-top: 2rem;
          border-top: 1px solid #eee;
          padding-top: 2rem;
        }

        .user-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .user-avatar {
          width: 60px;
          height: 60px;
          background: #e9ecef;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b2fa5;
        }

        .user-data h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.25rem;
          color: #333;
        }

        .user-email {
          margin: 0 0 0.25rem 0;
          color: #666;
        }

        .user-id {
          margin: 0;
          font-size: 0.85rem;
          color: #888;
        }

        .wallet-balance {
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .balance-label {
          font-weight: 500;
          color: #555;
        }

        .balance-amount {
          font-size: 1.25rem;
          font-weight: 600;
          color: #6b2fa5;
        }

        .debit-wallet-section {
          margin-top: 1rem;
        }

        .debit-form {
          max-width: 600px;
        }

        .debit-form input,
        .debit-form select,
        .debit-form textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }

        .charge-type-select {
          background-color: white;
          cursor: pointer;
        }

        .charge-description {
          resize: vertical;
          min-height: 80px;
        }

        .debit-actions {
          margin-top: 1.5rem;
        }

        .debit-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
          font-weight: 500;
        }

        .debit-button:hover:not(:disabled) {
          background: #c82333;
        }

        .debit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .new-transaction-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
          font-weight: 500;
        }

        .new-transaction-btn:hover {
          background: #218838;
        }

        /* Responsive styles */
        @media (max-width: 768px) {
          .wallet-debit-header {
            padding: 1.5rem;
          }

          .wallet-debit-content {
            padding: 1.5rem;
          }

          .header-top {
            flex-direction: column;
            align-items: flex-start;
          }

          .wallet-debit-header h1 {
            font-size: 1.5rem;
            margin-top: 1rem;
          }

          .search-input-container {
            flex-direction: column;
          }

          .search-button {
            width: 100%;
            justify-content: center;
          }

          .user-info {
            flex-direction: column;
            align-items: flex-start;
            text-align: center;
          }

          .user-avatar {
            margin: 0 auto 1rem;
          }

          .wallet-balance {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }
        }
      `}</style>
    </>
  )
}

export default WalletDebit
