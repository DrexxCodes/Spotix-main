"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, getDocs, query, orderBy, addDoc, doc, setDoc, getDoc } from "firebase/firestore"
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Calendar, Clock, Tag } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "./refund.css"

interface TicketItem {
  id: string
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  totalAmount: number
  ticketId: string
  ticketReference: string
  purchaseDate: string
  purchaseTime: string
  verified: boolean
  paymentMethod: string
  eventDate?: string
  eventVenue?: string
}

interface RefundFormData {
  ticketId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  purchaseDate: string
  reason: string
  customReason: string
  moreInformation: string
  agreedToPolicy: boolean
}

const Refund = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [showEligibilityDialog, setShowEligibilityDialog] = useState(false)
  const [eligibilityMessage, setEligibilityMessage] = useState("")
  const [isEligible, setIsEligible] = useState(false)
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [refundId, setRefundId] = useState("")

  // Form state
  const [formData, setFormData] = useState<RefundFormData>({
    ticketId: "",
    eventName: "",
    ticketType: "",
    ticketPrice: 0,
    purchaseDate: "",
    reason: "",
    customReason: "",
    moreInformation: "",
    agreedToPolicy: false,
  })

  const refundReasons = [
    "I changed my mind",
    "I need the money back",
    "The event is likely a scam",
    "I purchased the wrong ticket",
    "I don't like the organizer",
    "Other",
  ]

  useEffect(() => {
    fetchUserTickets()
  }, [])

  const fetchUserTickets = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      const ticketsCollectionRef = collection(db, "TicketHistory", user.uid, "tickets")
      const ticketsQuery = query(ticketsCollectionRef, orderBy("purchaseDate", "desc"))
      const ticketsSnapshot = await getDocs(ticketsQuery)

      const ticketsList: TicketItem[] = []
      ticketsSnapshot.forEach((doc) => {
        const data = doc.data()

        // Handle date and time formatting
        let purchaseDate = "N/A"
        let purchaseTime = "N/A"

        if (data.purchaseDate) {
          if (typeof data.purchaseDate === "string") {
            purchaseDate = data.purchaseDate
            purchaseTime = data.purchaseTime || "N/A"
          } else if (data.purchaseDate.toDate) {
            const date = data.purchaseDate.toDate()
            purchaseDate = date.toLocaleDateString()
            purchaseTime = date.toLocaleTimeString()
          }
        }

        ticketsList.push({
          id: doc.id,
          eventId: data.eventId || "",
          eventName: data.eventName || "Unknown Event",
          ticketType: data.ticketType || "Standard",
          ticketPrice: data.ticketPrice || 0,
          totalAmount: data.totalAmount || data.ticketPrice || 0,
          ticketId: data.ticketId || "",
          ticketReference: data.ticketReference || "",
          purchaseDate: purchaseDate,
          purchaseTime: purchaseTime,
          verified: data.verified || false,
          paymentMethod: data.paymentMethod || "Wallet",
          eventDate: data.eventDate || "",
          eventVenue: data.eventVenue || "",
        })
      })

      setTickets(ticketsList)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching tickets:", error)
      setLoading(false)
    }
  }

  const checkRefundEligibility = (ticket: TicketItem) => {
    const purchaseDate = new Date(ticket.purchaseDate)
    const currentDate = new Date()
    const daysDifference = Math.floor((currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDifference < 2) {
      // Too early for refund
      const eligibleDate = new Date(purchaseDate)
      eligibleDate.setDate(eligibleDate.getDate() + 2)
      setEligibilityMessage(
        `You just purchased this ticket, it isn't eligible for refund till ${eligibleDate.toLocaleDateString()}.`,
      )
      setIsEligible(false)
    } else if (daysDifference >= 2 && daysDifference <= 7) {
      // Eligible for refund
      setIsEligible(true)
      return true
    } else {
      // Too late for refund
      setEligibilityMessage("This ticket can no longer be refunded.")
      setIsEligible(false)
    }

    setShowEligibilityDialog(true)
    return false
  }

  const handleTicketSelect = (ticket: TicketItem) => {
    setSelectedTicket(ticket)

    if (checkRefundEligibility(ticket)) {
      // Ticket is eligible, show refund form
      setFormData({
        ticketId: ticket.ticketId,
        eventName: ticket.eventName,
        ticketType: ticket.ticketType,
        ticketPrice: ticket.totalAmount - 150, // Exclude NGN 150 transaction fee
        purchaseDate: ticket.purchaseDate,
        reason: "",
        customReason: "",
        moreInformation: "",
        agreedToPolicy: false,
      })
      setShowRefundForm(true)
    }
  }

  const handleReasonChange = (reason: string) => {
    setFormData((prev) => ({
      ...prev,
      reason,
      customReason: reason === "Other" ? prev.customReason : "",
    }))
  }

  // Function to send email notification
  const sendRefundNotification = async (refundData: any, userData: any) => {
    try {
      const response = await fetch("api/notify/refund-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refundId: refundData.refundId,
          userEmail: userData.email,
          userName: userData.fullName || userData.username || "User",
          eventName: refundData.eventName,
          ticketType: refundData.ticketType,
          ticketPrice: refundData.ticketPrice,
          refundReason: refundData.refundReason,
          customReason: refundData.customReason,
          moreInformation: refundData.moreInformation,
          ticketReference: selectedTicket?.ticketReference,
          requestDate: new Date().toLocaleDateString(),
          requestTime: new Date().toLocaleTimeString(),
        }),
      })

      if (response.ok) {
        console.log("Refund notification email sent successfully")
      } else {
        console.error("Failed to send refund notification email")
      }
    } catch (error) {
      console.error("Error sending refund notification email:", error)
    }
  }

  const handleSubmitRefund = async () => {
    if (!selectedTicket || !auth.currentUser) return

    // Validate form
    if (!formData.reason) {
      alert("Please select a reason for refund")
      return
    }

    if (formData.reason === "Other" && !formData.customReason.trim()) {
      alert("Please provide a custom reason")
      return
    }

    if (!formData.agreedToPolicy) {
      alert("Please agree to the refund policy")
      return
    }

    setSubmitting(true)

    try {
      const user = auth.currentUser

      // Get user data for email notification
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      const userData = userDoc.exists() ? userDoc.data() : {}

      const refundData = {
        refundId: "", // Will be set after document creation
        userId: user.uid,
        userEmail: user.email,
        ticketId: formData.ticketId,
        ticketReference: selectedTicket.ticketReference,
        eventId: selectedTicket.eventId,
        eventName: formData.eventName,
        ticketType: formData.ticketType,
        ticketPrice: formData.ticketPrice,
        purchaseDate: formData.purchaseDate,
        refundReason: formData.reason,
        customReason: formData.reason === "Other" ? formData.customReason : "",
        moreInformation: formData.moreInformation,
        status: "requested",
        requestDate: new Date().toISOString(),
        requestTime: new Date().toLocaleTimeString(),
        agreedToPolicy: formData.agreedToPolicy,
        paymentMethod: selectedTicket.paymentMethod,
      }

      // Create refund in root collection
      const refundsCollectionRef = collection(db, "refunds")
      const refundDocRef = await addDoc(refundsCollectionRef, refundData)

      // Update the document with its own ID as refundId
      await setDoc(
        refundDocRef,
        {
          refundId: refundDocRef.id,
        },
        { merge: true },
      )

      // Create refund in user's refunds subcollection using the same ID
      const userRefundsRef = doc(db, "TicketHistory", user.uid, "refunds", refundDocRef.id)
      await setDoc(userRefundsRef, {
        ...refundData,
        refundId: refundDocRef.id,
      })

      // Send email notification to admin
      await sendRefundNotification(
        {
          ...refundData,
          refundId: refundDocRef.id,
        },
        userData,
      )

      setRefundId(refundDocRef.id)
      setSubmitSuccess(true)
      setShowRefundForm(false)
    } catch (error) {
      console.error("Error submitting refund:", error)
      alert("Failed to submit refund request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  if (submitSuccess) {
    return (
      <>
        <Helmet>
          <title>Refund Request Submitted - Spotix</title>
          <meta name="description" content="Your refund request has been submitted successfully." />
        </Helmet>
        <UserHeader />
        <div className="refund-container">
          <div className="refund-success">
            <div className="success-icon">
              <CheckCircle size={80} className="text-green-500" />
            </div>
            <h2>Refund Request Submitted</h2>
            <p>Your refund request has been submitted successfully.</p>
            <div className="refund-details">
              <p>
                <strong>Refund Amount:</strong> NGN {formatNumber(formData.ticketPrice)}
              </p>
              <p>
                <strong>Transaction Fee (Non-refundable):</strong> NGN 150
              </p>
            </div>
            <p className="refund-note">
              We will review your request and process it within 3-5 business days. You will receive an email
              notification once your refund has been processed. An admin has been notified of your request.
            </p>
            <div className="success-actions">
              <button className="primary-button" onClick={() => navigate("/ticket-history")}>
                View My Tickets
              </button>
              <button className="secondary-button" onClick={() => navigate("/home")}>
                Go to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Request Refund - Spotix</title>
        <meta name="description" content="Request a refund for your Spotix ticket purchase." />
        <link rel="canonical" href={`${window.location.origin}/refund`} />
      </Helmet>
      <UserHeader />
      <div className="refund-container">
        <div className="refund-header">
          <button className="back-button" onClick={handleGoBack}>
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="refund-image">
            <img src="/refund.svg" alt="Refund" className="refund-svg" />
          </div>
          <h1>Request Refund</h1>
          <p>Select a ticket to request a refund. Refunds are only available 2-7 days after purchase.</p>
        </div>

        {!showRefundForm ? (
          <div className="ticket-selection">
            <h2>Select a Ticket to Refund</h2>
            {tickets.length === 0 ? (
              <div className="no-tickets">
                <p>You don't have any tickets to refund.</p>
                <button className="primary-button" onClick={() => navigate("/home")}>
                  Browse Events
                </button>
              </div>
            ) : (
              <div className="tickets-grid">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="ticket-card" onClick={() => handleTicketSelect(ticket)}>
                    <div className="ticket-header">
                      <h3>{ticket.eventName}</h3>
                      <span className="ticket-price">NGN {formatNumber(ticket.totalAmount)}</span>
                    </div>
                    <div className="ticket-details">
                      <div className="detail-item">
                        <Tag size={16} />
                        <span>{ticket.ticketType}</span>
                      </div>
                      <div className="detail-item">
                        <Calendar size={16} />
                        <span>{ticket.purchaseDate}</span>
                      </div>
                      <div className="detail-item">
                        <Clock size={16} />
                        <span>{ticket.purchaseTime}</span>
                      </div>
                    </div>
                    <div className="ticket-footer">
                      <span className="ticket-ref">Ref: {ticket.ticketReference}</span>
                      {ticket.verified ? (
                        <span className="verified">
                          <CheckCircle size={16} />
                          Verified
                        </span>
                      ) : (
                        <span className="not-verified">
                          <XCircle size={16} />
                          Not Verified
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="refund-form">
            <h2>Refund Request Form</h2>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="form-section">
                <h3>Ticket Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Event Name</label>
                    <input type="text" value={formData.eventName} disabled />
                  </div>
                  <div className="form-group">
                    <label>Ticket Type</label>
                    <input type="text" value={formData.ticketType} disabled />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ticket Price</label>
                    <input type="text" value={`NGN ${formatNumber(formData.ticketPrice)}`} disabled />
                  </div>
                  <div className="form-group">
                    <div className="transaction-fee-note">
                      <p>
                        <strong>Note:</strong> The NGN 150 transaction fee is non-refundable. Only the ticket price of
                        NGN {formatNumber(formData.ticketPrice)} will be refunded.
                      </p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input type="text" value={formData.purchaseDate} disabled />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Refund Reason</h3>
                <div className="reason-options">
                  {refundReasons.map((reason) => (
                    <label key={reason} className="reason-option">
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={formData.reason === reason}
                        onChange={(e) => handleReasonChange(e.target.value)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                {formData.reason === "Other" && (
                  <div className="form-group">
                    <label>Custom Reason *</label>
                    <input
                      type="text"
                      placeholder="Please specify your reason"
                      value={formData.customReason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customReason: e.target.value }))}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="form-section">
                <div className="form-group">
                  <label>More Information About the Refund</label>
                  <textarea
                    placeholder="Spotix may contact you for more details about your refund, you can fill it now and we won't contact you for more details before processing refunds."
                    value={formData.moreInformation}
                    onChange={(e) => setFormData((prev) => ({ ...prev, moreInformation: e.target.value }))}
                    rows={4}
                  />
                </div>
              </div>

              <div className="form-section">
                <label className="policy-agreement">
                  <input
                    type="checkbox"
                    checked={formData.agreedToPolicy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, agreedToPolicy: e.target.checked }))}
                  />
                  <span>
                    You agree to have read our{" "}
                    <a href="https://my.spotix.com.ng/refunds" target="_blank" rel="noopener noreferrer">
                      Refunds Policy
                    </a>{" "}
                    and we will process your refunds accordingly.
                  </span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowRefundForm(false)
                    setSelectedTicket(null)
                  }}
                >
                  Cancel
                </button>
                {formData.agreedToPolicy && (
                  <button type="button" className="primary-button" onClick={handleSubmitRefund} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Refund Request"}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Eligibility Dialog */}
        {showEligibilityDialog && (
          <div className="dialog-overlay">
            <div className="dialog">
              <div className="dialog-header">
                <AlertTriangle size={40} className={isEligible ? "text-green-500" : "text-orange-500"} />
                <h3>{isEligible ? "Refund Eligible" : "Refund Not Available"}</h3>
              </div>
              <p>{eligibilityMessage}</p>
              <button className="primary-button" onClick={() => setShowEligibilityDialog(false)}>
                OK, I Understand
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default Refund
