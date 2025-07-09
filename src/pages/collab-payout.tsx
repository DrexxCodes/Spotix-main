"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { collection, query, getDocs, doc, getDoc, updateDoc, orderBy } from "firebase/firestore"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield,
  Wallet,
  ArrowUpRight,
  Info,
} from "lucide-react"
import "./collab-payout.css"

// Utility function to format Firestore timestamps
const formatFirestoreTimestamp = (timestamp: any): string => {
  if (!timestamp) return "Unknown"

  // Check if it's a Firestore timestamp (has seconds and nanoseconds)
  if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
    try {
      // Convert Firestore timestamp to JavaScript Date
      const date = new Date(timestamp.seconds * 1000)
      return date.toLocaleDateString()
    } catch (error) {
      console.error("Error formatting timestamp:", error)
      return "Invalid date"
    }
  }

  // If it's already a string, just return it
  return String(timestamp)
}

// Utility function to format transaction time
const formatTransactionTime = (timestamp: any): string => {
  if (!timestamp) return "Unknown"

  // Check if it's a Firestore timestamp
  if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
    try {
      // Convert Firestore timestamp to JavaScript Date with time
      const date = new Date(timestamp.seconds * 1000)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (error) {
      console.error("Error formatting transaction time:", error)
      return "Invalid time"
    }
  }

  return String(timestamp)
}

interface PayoutData {
  id?: string
  date: string
  amount: number
  status: string
  actionCode?: string
  reference?: string
  createdAt?: any
  payoutAmount?: number
  payableAmount?: number
  agentName?: string
  transactionTime?: string
  collaboratorUid?: string
  collaboratorName?: string
}

interface EventData {
  id: string
  eventName: string
  eventImage: string
  totalRevenue: number
  availableRevenue: number
  totalPaidOut: number
}

interface CollaborationState {
  collaborationId: string
  eventId: string
  eventName: string
  eventImage?: string
  ownerUid: string
  role: string
}

const CollabPayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const collaborationState = location.state as CollaborationState

  const [loading, setLoading] = useState(true)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [payouts, setPayouts] = useState<PayoutData[]>([])
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [totalPaidOut, setTotalPaidOut] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [actionCode, setActionCode] = useState<string>("")
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [visibleActionCodes, setVisibleActionCodes] = useState<Record<string, boolean>>({})
  const [userName, setUserName] = useState<string>("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Debug log the collaboration state
        console.log("collab-payout received state:", collaborationState)

        // Validate collaboration state
        if (!collaborationState || !collaborationState.eventId || !collaborationState.ownerUid) {
          console.error("Missing required state properties", collaborationState)
          setErrorMessage("Invalid collaboration data. Please go back and try again.")
          setLoading(false)
          navigate("/collabs")
          return
        }

        const user = auth.currentUser
        if (!user) {
          console.error("No authenticated user")
          navigate("/login")
          return
        }

        // Get user name for payout records
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserName(userData.fullName || userData.username || user.uid)
        }

        // Verify the user has access to this event as a collaborator
        const collaboratorDocRef = doc(
          db,
          "events",
          collaborationState.ownerUid,
          "userEvents",
          collaborationState.eventId,
          "collaborators",
          collaborationState.collaborationId,
        )

        const collaboratorDoc = await getDoc(collaboratorDocRef)

        if (!collaboratorDoc.exists()) {
          console.error("Collaboration document not found")
          setErrorMessage("Collaboration not found. Please go back and try again.")
          setLoading(false)
          navigate("/collabs")
          return
        }

        const collaboratorData = collaboratorDoc.data()

        // Verify that the current user is the collaborator
        if (collaboratorData.uid !== user.uid) {
          console.error("User does not match collaboration")
          setErrorMessage("Access denied. You do not have permission to access this collaboration.")
          setLoading(false)
          navigate("/collabs")
          return
        }

        // Verify the user has the correct role
        const normalizedRole = collaboratorData.role.toLowerCase()
        if (normalizedRole !== "accountant" && normalizedRole !== "admin") {
          console.error("User does not have the correct role")
          setErrorMessage("Access denied. You need Accountant or Admin role to manage payouts.")
          setLoading(false)
          navigate("/collabs")
          return
        }

        // Get event details
        const eventDocRef = doc(db, "events", collaborationState.ownerUid, "userEvents", collaborationState.eventId)
        const eventDoc = await getDoc(eventDocRef)

        if (!eventDoc.exists()) {
          setErrorMessage("Event not found. Please go back and try again.")
          setLoading(false)
          return
        }

        const eventData = eventDoc.data()

        // Set event data
        setEventData({
          id: eventDoc.id,
          eventName: eventData.eventName || "Unnamed Event",
          eventImage: eventData.eventImage || "",
          totalRevenue: eventData.totalRevenue || 0,
          availableRevenue: eventData.availableRevenue || eventData.totalRevenue || 0,
          totalPaidOut: eventData.totalPaidOut || 0,
        })

        setAvailableBalance(eventData.availableRevenue || eventData.totalRevenue || 0)
        setTotalPaidOut(eventData.totalPaidOut || 0)

        // Fetch payouts
        const payoutsCollectionRef = collection(
          db,
          "events",
          collaborationState.ownerUid,
          "userEvents",
          collaborationState.eventId,
          "payouts",
        )

        const payoutsQuery = query(payoutsCollectionRef, orderBy("createdAt", "desc"))
        const payoutsSnapshot = await getDocs(payoutsQuery)

        if (!payoutsSnapshot.empty) {
          const payoutsList: PayoutData[] = []

          payoutsSnapshot.forEach((doc) => {
            const payoutData = doc.data()

            payoutsList.push({
              id: doc.id,
              date: formatFirestoreTimestamp(payoutData.createdAt) || new Date().toLocaleDateString(),
              amount: payoutData.payoutAmount || 0,
              status: payoutData.status || "Pending",
              actionCode: payoutData.actionCode || "",
              reference: payoutData.reference || "",
              createdAt: payoutData.createdAt,
              payoutAmount: payoutData.payoutAmount || 0,
              payableAmount: payoutData.payableAmount || 0,
              agentName: payoutData.agentName || "",
              transactionTime: payoutData.transactionTime || formatTransactionTime(payoutData.createdAt) || "",
              collaboratorUid: payoutData.collaboratorUid || "",
              collaboratorName: payoutData.collaboratorName || "",
            })
          })

          setPayouts(payoutsList)
        } else {
          setPayouts([])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setErrorMessage("An error occurred while loading data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate, collaborationState])

  const handleConfirmPayout = async (payoutId: string) => {
    try {
      setLoading(true)

      // Find the payout
      const payout = payouts.find((p) => p.id === payoutId)
      if (!payout) {
        throw new Error("Payout not found")
      }

      // Verify action code
      if (!actionCode) {
        setErrorMessage("Please enter the action code")
        setLoading(false)
        return
      }

      if (actionCode !== payout.actionCode) {
        setErrorMessage("Invalid action code. Please check and try again.")
        setLoading(false)
        return
      }

      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      // Update payout status in Firestore
      const payoutDocRef = doc(
        db,
        "events",
        collaborationState.ownerUid,
        "userEvents",
        collaborationState.eventId,
        "payouts",
        payoutId,
      )

      await updateDoc(payoutDocRef, {
        status: "Confirmed",
        confirmedAt: new Date(),
        confirmedBy: user.uid,
        confirmedByName: userName,
      })

      // Update event document with new total paid out
      const eventDocRef = doc(db, "events", collaborationState.ownerUid, "userEvents", collaborationState.eventId)

      await updateDoc(eventDocRef, {
        totalPaidOut: totalPaidOut + payout.amount,
      })

      // Update local state
      const updatedPayouts = payouts.map((p) => {
        if (p.id === payoutId) {
          return { ...p, status: "Confirmed" }
        }
        return p
      })

      setPayouts(updatedPayouts)
      setTotalPaidOut(totalPaidOut + payout.amount)

      // Reset action code and selected payout
      setActionCode("")
      setSelectedPayoutId(null)

      setSuccessMessage("Payout confirmed successfully!")
    } catch (error) {
      console.error("Error confirming payout:", error)
      setErrorMessage("Failed to confirm payout. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
      },
      (err) => {
        console.error("Could not copy text: ", err)
      },
    )
  }

  const toggleActionCodeVisibility = (payoutId: string) => {
    setVisibleActionCodes((prev) => ({
      ...prev,
      [payoutId]: !prev[payoutId],
    }))
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  if (loading) {
    return <Preloader />
  }

  return (
    <>
      <BookersHeader />
      <div className="collab-payout-container">
        <div className="payout-header">
          <button className="back-button" onClick={handleGoBack}>
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="event-info">
            {eventData?.eventImage ? (
              <img src={eventData.eventImage || "/placeholder.svg"} alt={eventData.eventName} className="event-image" />
            ) : (
              <div className="event-image-placeholder"></div>
            )}
            <h1>{eventData?.eventName || "Event"}</h1>
          </div>

          <div className="role-badge">{collaborationState.role === "admin" ? "Admin" : "Accountant"}</div>
        </div>

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={16} />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            <CheckCircle size={16} />
            <p>{successMessage}</p>
          </div>
        )}

        <div className="info-message">
          <Info size={16} />
          <p>
            Payouts are initiated by Spotix Official accountants. When a payout is created, you'll see it below with an
            action code. Share this code with the Spotix accountant to complete the transaction.
          </p>
        </div>

        <div className="balance-summary">
          <div className="balance-card">
            <div className="balance-icon">
              <Wallet size={24} />
            </div>
            <div className="balance-details">
              <h4>Available Balance</h4>
              <p className="balance-amount">₦{availableBalance.toFixed(2)}</p>
              <span className="balance-label">Ready to withdraw</span>
            </div>
          </div>
          <div className="balance-card">
            <div className="balance-icon">
              <ArrowUpRight size={24} />
            </div>
            <div className="balance-details">
              <h4>Total Paid Out</h4>
              <p className="balance-amount">₦{totalPaidOut.toFixed(2)}</p>
              <span className="balance-label">Successfully processed</span>
            </div>
          </div>
        </div>

        <div className="payouts-history">
          <h2>Payout History</h2>

          {payouts.length > 0 ? (
            <div className="payouts-table-container">
              <table className="payouts-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Agent</th>
                    <th>Action Code</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td>{payout.date}</td>
                      <td>{payout.transactionTime || "N/A"}</td>
                      <td>{payout.reference || "N/A"}</td>
                      <td>₦{payout.amount.toFixed(2)}</td>
                      <td>{payout.agentName || userName}</td>
                      <td className="action-code-cell">
                        {payout.actionCode ? (
                          <div className="action-code-container">
                            <span className={visibleActionCodes[payout.id || ""] ? "visible-code" : "hidden-code"}>
                              {visibleActionCodes[payout.id || ""] ? payout.actionCode : "••••••"}
                            </span>
                            <button
                              className="toggle-visibility-btn"
                              onClick={() => toggleActionCodeVisibility(payout.id || "")}
                              title={visibleActionCodes[payout.id || ""] ? "Hide code" : "Show code"}
                            >
                              {visibleActionCodes[payout.id || ""] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                              className="copy-button"
                              onClick={() => copyToClipboard(payout.actionCode || "", `actionCode-${payout.id}`)}
                              title="Copy code"
                            >
                              {copiedField === `actionCode-${payout.id}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${payout.status.toLowerCase()}`}>{payout.status}</span>
                      </td>
                      <td>
                        {payout.status === "Pending" && payout.actionCode && (
                          <button className="confirm-payout-btn" onClick={() => setSelectedPayoutId(payout.id ?? null)}>
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-payouts">
              <p>No payouts have been created yet. Contact a Spotix accountant to initiate a payout.</p>
            </div>
          )}
        </div>

        {/* Action Code Confirmation Modal */}
        {selectedPayoutId && (
          <div className="action-code-modal">
            <div className="action-code-content">
              <h4>Confirm Payout</h4>
              <p>Enter the action code provided by the Spotix accountant to confirm this payout.</p>
              <div className="form-group">
                <label>Action Code</label>
                <input
                  type="text"
                  value={actionCode}
                  onChange={(e) => setActionCode(e.target.value)}
                  placeholder="Enter action code"
                />
              </div>
              <div className="action-buttons">
                <button className="confirm-button" onClick={() => handleConfirmPayout(selectedPayoutId)}>
                  Confirm
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    setSelectedPayoutId(null)
                    setActionCode("")
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Information */}
        <div className="payout-security-info">
          <div className="security-header">
            <Shield size={18} />
            <h4>Payout Security Information</h4>
          </div>
          <div className="security-content">
            <p>For your security, we use action codes to verify payout requests:</p>
            <ol>
              <li>Spotix accountants will initiate payouts on your behalf</li>
              <li>When a payout is created, you'll see an action code in the table above</li>
              <li>Share this code with the Spotix accountant who initiated the payout</li>
              <li>The accountant will enter this code to verify and process your payout</li>
              <li>Once verified, your payout will be processed</li>
            </ol>
            <p className="security-warning">
              <strong>Important:</strong> Never share your action codes with anyone except authorized Spotix
              accountants.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default CollabPayout
