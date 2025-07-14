"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Helmet } from "react-helmet"
import { Mail, Share2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "boxicons/css/boxicons.min.css"
import "./ticket.css" // New CSS file for ticket component

// Define comprehensive interfaces for better type safety
interface PaymentPageProps {
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  eventCreatorId: string
  finalPrice: number
  transactionFee: number
  totalAmount: number
  appliedDiscount: DiscountData | null
}

interface DiscountData {
  code: string
  type: "percentage" | "flat"
  value: number
  maxUses: number
  usedCount: number
  active: boolean
}

interface EventDetails {
  eventVenue: string
  eventType: string
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  stopDate?: string
  enableStopDate?: boolean
  bookerName?: string
  bookerEmail?: string
}

interface TicketResultData {
  success: boolean
  message: string
  ticketId: string
  ticketReference: string
  userData: {
    fullName: string
    email: string
  }
}

interface TicketPageLocationState {
  paymentResult: TicketResultData
  paymentData: PaymentPageProps
  eventDetails: EventDetails
  isFreeEvent: boolean
  adjustedTransactionFee: number
  adjustedTotalAmount: number
}

const Ticket: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [ticketInfo, setTicketInfo] = useState<TicketPageLocationState | null>(null)
  const [shareUrl, setShareUrl] = useState<string>("")
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [emailSent, setEmailSent] = useState(false) // Assuming email is sent by wallet.tsx
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  useEffect(() => {
    if (!location.state) {
      navigate("/home") // Redirect if no state is passed
      return
    }

    const state = location.state as TicketPageLocationState
    setTicketInfo(state)
    setShareUrl(`${window.location.origin}/event/${state.paymentData.eventCreatorId}/${state.paymentData.eventId}`)
    setEmailSent(true) // Assuming email is sent by the payment process in wallet.tsx or paystack-success.tsx
    setLoading(false)
  }, [location.state, navigate])

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const handleGoHome = () => {
    navigate("/home")
  }

  const handleViewTickets = () => {
    navigate("/ticket-history")
  }

  const handleShare = () => {
    setShowShareOptions(!showShareOptions)
  }

  const shareToSocialMedia = (platform: string) => {
    if (!ticketInfo) return

    const eventName = ticketInfo.paymentData.eventName || "this event"
    const shareText = `Hey friends! I just got a ticket to ${eventName} from Spotix! Get yours here: `

    let shareLink = ""

    switch (platform) {
      case "whatsapp":
        shareLink = `https://wa.me/?text=${encodeURIComponent(shareText + shareUrl)}`
        break
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
        break
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        break
      default:
        break
    }

    if (shareLink) {
      window.open(shareLink, "_blank")
    }

    setShowShareOptions(false)
  }

  const copyShareLink = () => {
    if (!ticketInfo) return

    const eventName = ticketInfo.paymentData.eventName || "this event"
    const shareText = `Hey friends! I just got a ticket to ${eventName} from Spotix! Get yours here: ${shareUrl}`

    navigator.clipboard.writeText(shareText).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  if (loading || !ticketInfo) {
    return <Preloader loading={true} />
  }

  const { paymentResult, paymentData, eventDetails, isFreeEvent, adjustedTransactionFee, adjustedTotalAmount } =
    ticketInfo

  return (
    <>
      <Helmet>
        <title>Ticket for {paymentData.eventName} - Spotix</title>
        <meta name="description" content={`Your ticket details for ${paymentData.eventName} on Spotix.`} />
        <link rel="canonical" href={`${window.location.origin}/ticket`} />
        <meta property="og:title" content={`Ticket for ${paymentData.eventName} - Spotix`} />
        <meta property="og:description" content={`Your ticket details for ${paymentData.eventName} on Spotix.`} />
      </Helmet>
      <UserHeader />
      <div className="ticket-page-container">
        {paymentResult.success ? (
          <div className="payment-success">
            <div className="success-icon">
              <CheckCircle size={60} className="text-green-500" />
            </div>
            <h2>{isFreeEvent ? "Free Ticket Acquired!" : "Payment Successful!"}</h2>

            <div className="security-badge-container">
              <div className="security-badge">
                <div className="security-badge-icon">
                  <div className="security-shield">
                    <i className="bx bxs-shield-alt-2"></i>
                  </div>
                </div>
                <div className="security-badge-text">
                  <span>Secured by</span>
                  <strong>Spotix IWSS</strong>
                </div>
              </div>
            </div>

            {emailSent && (
              <div className="email-confirmation-message">
                <Mail size={18} className="email-icon" />
                <p>A confirmation email has been sent to your registered email address.</p>
              </div>
            )}

            <div className="ticket-preview">
              <div className="ticket-header">
                <img src="/logo.svg" alt="Spotix Logo" className="ticket-logo" />
                <h3>SPOTIX</h3>
              </div>
              <div className="ticket-details">
                <div className="ticket-detail-row">
                  <span>Name:</span>
                  <span>{paymentResult.userData?.fullName}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Email:</span>
                  <span>{paymentResult.userData?.email}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Event:</span>
                  <span>{paymentData.eventName}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Venue:</span>
                  <span>{eventDetails?.eventVenue || "Not specified"}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Date:</span>
                  <span>
                    {eventDetails?.eventDate ? new Date(eventDetails.eventDate).toLocaleDateString() : "Not specified"}
                  </span>
                </div>
                <div className="ticket-detail-row">
                  <span>Time:</span>
                  <span>
                    {eventDetails?.eventStart && eventDetails?.eventEnd
                      ? `${eventDetails.eventStart} - ${eventDetails.eventEnd}`
                      : "Not specified"}
                  </span>
                </div>
                <div className="ticket-detail-row">
                  <span>Ticket Type:</span>
                  <span>{paymentData.ticketType}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Ticket ID:</span>
                  <span className="ticket-id">{paymentResult.ticketId}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Reference:</span>
                  <span>{paymentResult.ticketReference}</span>
                </div>
                {paymentData.appliedDiscount && (
                  <div className="ticket-detail-row">
                    <span>Discount Applied:</span>
                    <span>{paymentData.appliedDiscount.code}</span>
                  </div>
                )}
                <div className="ticket-detail-row">
                  <span>Ticket Price:</span>
                  <span>NGN {formatNumber(paymentData.finalPrice)}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Transaction Fee:</span>
                  {isFreeEvent ? (
                    <span>
                      <span style={{ textDecoration: "line-through", color: "#999" }}>NGN {formatNumber(150)}</span>
                      <span style={{ color: "#28a745", marginLeft: "8px", fontSize: "0.85rem" }}>Waived</span>
                    </span>
                  ) : (
                    <span>NGN {formatNumber(adjustedTransactionFee)}</span>
                  )}
                </div>
                <div className="ticket-detail-row">
                  <span>Amount Paid:</span>
                  <span>NGN {formatNumber(adjustedTotalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Social Share Section */}
            <div className="social-share-container">
              <h3>Share Your Ticket</h3>
              <p>Let your friends know about this event!</p>

              <div className="share-buttons">
                <button className="share-button" onClick={handleShare}>
                  <Share2 size={18} />
                  Share
                </button>

                {showShareOptions && (
                  <div className="share-options">
                    <button className="share-option whatsapp" onClick={() => shareToSocialMedia("whatsapp")}>
                      <i className="bx bxl-whatsapp"></i>
                      WhatsApp
                    </button>
                    <button className="share-option twitter" onClick={() => shareToSocialMedia("twitter")}>
                      <i className="bx bxl-twitter"></i>
                      Twitter
                    </button>
                    <button className="share-option facebook" onClick={() => shareToSocialMedia("facebook")}>
                      <i className="bx bxl-facebook"></i>
                      Facebook
                    </button>
                    <button className={`share-option copy ${copySuccess ? "success" : ""}`} onClick={copyShareLink}>
                      {copySuccess ? (
                        <>
                          <CheckCircle size={16} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <i className="bx bx-link"></i>
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="success-actions">
              <button className="view-tickets-btn" onClick={handleViewTickets}>
                View My Tickets
              </button>
              <button className="home-btn" onClick={handleGoHome}>
                Go to Home
              </button>
            </div>
          </div>
        ) : (
          <div className="payment-failed">
            <div className="error-icon">
              <XCircle size={60} className="text-red-500" />
            </div>
            <h2>Ticket Acquisition Failed</h2>
            <p className="error-message">{paymentResult.message}</p>

            {errorDetails && (
              <div className="error-details">
                <AlertTriangle size={16} className="error-details-icon" />
                <p>{errorDetails}</p>
              </div>
            )}

            <div className="failed-actions">
              <button className="close-dialog-btn" onClick={handleGoHome}>
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default Ticket
