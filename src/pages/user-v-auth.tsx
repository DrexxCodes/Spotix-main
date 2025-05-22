"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import { AlertCircle, CheckCircle, Search, Clock, User, Mail, Ticket, Tag, Calendar, Shield, X } from "lucide-react"
import "./user-v-auth.css"

interface AuthData {
  customerName: string
  customerEmail: string
  eventName: string
  ticketType: string
  ticketPrice: string
  agentUsername: string
  agentId: string
  agentUid: string
  validated: boolean
  createdAt: any
  validatedBy?: string
  validatedByUid?: string
  validatedAt?: any
}

const UserVAuth = () => {
  const [loading, setLoading] = useState(false)
  const [authCode, setAuthCode] = useState("")
  const [authData, setAuthData] = useState<AuthData | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [userData, setUserData] = useState<{ username: string; uid: string } | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const user = auth.currentUser
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setUserData({
              username: data.username || data.fullName || "Unknown User",
              uid: user.uid,
            })
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
    }

    getCurrentUser()
  }, [])

  useEffect(() => {
    // Auto-search when code is 22 characters (SP-Auth-XXXXXXXXXXXX)
    if (authCode.length === 22) {
      handleSearch()
    }
  }, [authCode])

  const handleSearch = async () => {
    if (authCode.length !== 22) {
      setErrorMessage("Please enter a valid 22-character auth code")
      return
    }

    setLoading(true)
    setErrorMessage("")
    setAuthData(null)

    try {
      const authDocRef = doc(db, "AuthKey", authCode)
      const authDoc = await getDoc(authDocRef)

      if (!authDoc.exists()) {
        setErrorMessage("Invalid auth code. No transaction found with this code.")
        return
      }

      const data = authDoc.data() as AuthData
      setAuthData(data)

      if (data.validated) {
        setSuccessMessage("This transaction has already been validated.")
      } else {
        setSuccessMessage("Transaction found! You can now validate this transaction.")
      }
    } catch (error) {
      console.error("Error searching for auth code:", error)
      setErrorMessage("An error occurred while searching. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    if (!authData || !userData) {
      setErrorMessage("Cannot validate. Missing transaction or user data.")
      return
    }

    if (authData.validated) {
      setErrorMessage("This transaction has already been validated.")
      return
    }

    setIsValidating(true)
    setErrorMessage("")

    try {
      const authDocRef = doc(db, "AuthKey", authCode)

      await updateDoc(authDocRef, {
        validated: true,
        validatedBy: userData.username,
        validatedByUid: userData.uid,
        validatedAt: Timestamp.now(),
      })

      // Update local state
      setAuthData({
        ...authData,
        validated: true,
        validatedBy: userData.username,
        validatedByUid: userData.uid,
        validatedAt: Timestamp.now(),
      })

      setSuccessMessage("Transaction successfully validated!")
    } catch (error) {
      console.error("Error validating transaction:", error)
      setErrorMessage("Failed to validate transaction. Please try again.")
    } finally {
      setIsValidating(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString()
  }

  const clearSearch = () => {
    setAuthCode("")
    setAuthData(null)
    setErrorMessage("")
    setSuccessMessage("")
  }

  return (
    <>
      <UserHeader />
      <div className="user-v-auth-container">
        <div className="auth-header">
          <Shield className="auth-icon" />
          <h1>Verify Your Transaction</h1>
        </div>

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={16} />
            <p>{errorMessage}</p>
            <button onClick={() => setErrorMessage("")} className="close-message">
              <X size={14} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            <CheckCircle size={16} />
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage("")} className="close-message">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="search-section">
          <h2>Enter Verification Code</h2>
          <p className="search-description">
            Enter the 22-character verification code provided by the agent to verify your transaction.
          </p>

          <div className="search-container">
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
              placeholder="SP-Auth-XXXXXXXXXXXX"
              maxLength={22}
              className="auth-code-input"
            />

            <button onClick={handleSearch} disabled={loading || authCode.length !== 22} className="search-button">
              {loading ? "Searching..." : <Search size={18} />}
            </button>

            {authCode && (
              <button onClick={clearSearch} className="clear-button">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="code-format-hint">
            <p>Format: SP-Auth-XXXXXXXXXXXX (22 characters)</p>
          </div>
        </div>

        {authData && (
          <div className="transaction-details">
            <h2>Transaction Details</h2>

            <div className="transaction-card">
              <div className="transaction-header">
                <div className="transaction-id">
                  <span>Verification Code:</span>
                  <span className="code-value">{authCode}</span>
                </div>
                <div className={`transaction-status ${authData.validated ? "validated" : "pending"}`}>
                  {authData.validated ? "Validated" : "Pending Validation"}
                </div>
              </div>

              <div className="transaction-body">
                <div className="detail-section">
                  <h3>Customer Information</h3>
                  <div className="detail-item">
                    <User size={16} />
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{authData.customerName}</span>
                  </div>
                  <div className="detail-item">
                    <Mail size={16} />
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{authData.customerEmail}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Ticket Information</h3>
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span className="detail-label">Event:</span>
                    <span className="detail-value">{authData.eventName}</span>
                  </div>
                  <div className="detail-item">
                    <Ticket size={16} />
                    <span className="detail-label">Ticket Type:</span>
                    <span className="detail-value">{authData.ticketType}</span>
                  </div>
                  <div className="detail-item">
                    <Tag size={16} />
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">{authData.ticketPrice}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Agent Information</h3>
                  <div className="detail-item">
                    <User size={16} />
                    <span className="detail-label">Agent:</span>
                    <span className="detail-value">{authData.agentUsername}</span>
                  </div>
                  <div className="detail-item">
                    <Shield size={16} />
                    <span className="detail-label">Agent ID:</span>
                    <span className="detail-value">{authData.agentId}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Transaction Timeline</h3>
                  <div className="detail-item">
                    <Clock size={16} />
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{formatDate(authData.createdAt)}</span>
                  </div>

                  {authData.validated && (
                    <div className="detail-item">
                      <CheckCircle size={16} />
                      <span className="detail-label">Validated:</span>
                      <span className="detail-value">{formatDate(authData.validatedAt)}</span>
                    </div>
                  )}

                  {authData.validated && (
                    <div className="detail-item">
                      <User size={16} />
                      <span className="detail-label">Validated By:</span>
                      <span className="detail-value">{authData.validatedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {!authData.validated && userData && (
                <div className="transaction-footer">
                  <button onClick={handleValidate} disabled={isValidating} className="validate-button">
                    {isValidating ? "Validating..." : "Validate Transaction"}
                  </button>
                  <p className="validation-note">
                    By validating, you confirm that you received this ticket from the agent listed above.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="verification-guide">
          <h2>How Verification Works</h2>
          <ol className="guide-steps">
            <li>
              <span className="step-number">1</span>
              <div className="step-content">
                <h3>Get the verification code</h3>
                <p>Ask the agent for the 22-character verification code that starts with "SP-Auth-".</p>
              </div>
            </li>
            <li>
              <span className="step-number">2</span>
              <div className="step-content">
                <h3>Enter the code</h3>
                <p>Type or paste the code in the search box above. The search will start automatically.</p>
              </div>
            </li>
            <li>
              <span className="step-number">3</span>
              <div className="step-content">
                <h3>Verify the details</h3>
                <p>Check that the transaction details match what you agreed with the agent.</p>
              </div>
            </li>
            <li>
              <span className="step-number">4</span>
              <div className="step-content">
                <h3>Validate the transaction</h3>
                <p>Click the "Validate Transaction" button to confirm the purchase is legitimate.</p>
              </div>
            </li>
          </ol>

          <div className="verification-warning">
            <AlertCircle size={20} />
            <div>
              <h3>Important Safety Notice</h3>
              <p>
                Only validate transactions from official Spotix agents. If something doesn't look right, do not validate
                the transaction and contact Spotix support immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default UserVAuth
