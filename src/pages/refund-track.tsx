"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { ArrowLeft, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Mail } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "./refund-track.css"

interface RefundItem {
  id: string
  refundId: string
  eventName: string
  ticketPrice: number
  status: "requested" | "processing" | "refunded" | "denied"
  requestDate: string
  requestTime: string
  refundReason: string
  customReason?: string
  moreInformation?: string
  ticketId: string
  ticketReference: string
  eventId: string
  userId: string
  userEmail: string
}

const RefundTrack = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refunds, setRefunds] = useState<RefundItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRefunds()
  }, [])

  const fetchRefunds = async (isRefresh = false) => {
    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      setError(null)
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const refundsCollectionRef = collection(db, "TicketHistory", user.uid, "refunds")
      const refundsQuery = query(refundsCollectionRef, orderBy("requestDate", "desc"))
      const refundsSnapshot = await getDocs(refundsQuery)

      const refundsList: RefundItem[] = []
      refundsSnapshot.forEach((doc) => {
        const data = doc.data()

        // Handle date and time formatting
        let requestDate = "N/A"
        let requestTime = "N/A"

        if (data.requestDate) {
          if (typeof data.requestDate === "string") {
            const date = new Date(data.requestDate)
            requestDate = date.toLocaleDateString()
            requestTime = data.requestTime || date.toLocaleTimeString()
          } else if (data.requestDate.toDate) {
            const date = data.requestDate.toDate()
            requestDate = date.toLocaleDateString()
            requestTime = date.toLocaleTimeString()
          }
        }

        refundsList.push({
          id: doc.id,
          refundId: data.refundId || doc.id,
          eventName: data.eventName || "Unknown Event",
          ticketPrice: data.ticketPrice || 0,
          status: data.status || "requested",
          requestDate: requestDate,
          requestTime: requestTime,
          refundReason: data.refundReason || "",
          customReason: data.customReason || "",
          moreInformation: data.moreInformation || "",
          ticketId: data.ticketId || "",
          ticketReference: data.ticketReference || "",
          eventId: data.eventId || "",
          userId: data.userId || "",
          userEmail: data.userEmail || "",
        })
      })

      setRefunds(refundsList)
    } catch (error) {
      console.error("Error fetching refunds:", error)
      setError("Failed to load refund history. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchRefunds(true)
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "requested":
        return {
          className: "status-requested",
          text: "Requested",
          icon: <Clock size={16} />,
          description: "Your refund request is pending review",
        }
      case "processing":
        return {
          className: "status-processing",
          text: "Processing",
          icon: <RefreshCw size={16} className="animate-spin" />,
          description: "Your refund is being processed",
        }
      case "refunded":
        return {
          className: "status-refunded",
          text: "Refunded",
          icon: <CheckCircle size={16} />,
          description: "Your refund has been completed successfully",
        }
      case "denied":
        return {
          className: "status-denied",
          text: "Denied",
          icon: <XCircle size={16} />,
          description: "Oh, it seems your refund request wasn't approved, please contact us",
        }
      default:
        return {
          className: "status-requested",
          text: "Unknown",
          icon: <AlertTriangle size={16} />,
          description: "Status unknown",
        }
    }
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  const handleContactSupport = () => {
    window.open("mailto:support@spotix.com.ng?subject=Refund Request Support", "_blank")
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <Helmet>
        <title>Track Refunds - Spotix</title>
        <meta name="description" content="Track the status of your refund requests on Spotix." />
        <link rel="canonical" href={`${window.location.origin}/refund-track`} />
        <meta property="og:title" content="Track Refunds - Spotix" />
        <meta property="og:description" content="Track the status of your refund requests on Spotix." />
      </Helmet>
      <UserHeader />
      <div className="refund-track-container">
        <div className="refund-track-header">
          <div className="header-top">
            <button className="back-button" onClick={handleGoBack}>
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Track Refunds</h1>
            <button className="refresh-button" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <p>Monitor the status of all your refund requests</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertTriangle size={20} />
            <span>{error}</span>
            <button onClick={handleRefresh} className="retry-button">
              Try Again
            </button>
          </div>
        )}

        <div className="refunds-section">
          {refunds.length === 0 ? (
            <div className="no-refunds">
              <div className="no-refunds-icon">
                <RefreshCw size={60} />
              </div>
              <h3>No Refund Requests</h3>
              <p>You haven't made any refund requests yet.</p>
              <div className="no-refunds-actions">
                <button className="primary-button" onClick={() => navigate("/refund")}>
                  Request Refund
                </button>
                <button className="secondary-button" onClick={() => navigate("/ticket-history")}>
                  View Tickets
                </button>
              </div>
            </div>
          ) : (
            <div className="refunds-grid">
              {refunds.map((refund) => {
                const statusConfig = getStatusConfig(refund.status)
                return (
                  <div key={refund.id} className="refund-card">
                    <div className="refund-card-header">
                      <div className="refund-id">
                        <span className="refund-id-label">Refund ID:</span>
                        <span className="refund-id-value">{refund.refundId}</span>
                      </div>
                      <div className={`status-badge ${statusConfig.className}`}>
                        {statusConfig.icon}
                        <span>{statusConfig.text}</span>
                      </div>
                    </div>

                    <div className="refund-card-content">
                      <div className="refund-event">
                        <h3>{refund.eventName}</h3>
                      </div>

                      <div className="refund-amount">
                        <span className="amount-label">Refundable Amount:</span>
                        <span className="amount-value">NGN {formatNumber(refund.ticketPrice)}</span>
                      </div>

                      <div className="refund-date-time">
                        <div className="date-time-item">
                          <span className="label">Request Date:</span>
                          <span className="value">{refund.requestDate}</span>
                        </div>
                        <div className="date-time-item">
                          <span className="label">Request Time:</span>
                          <span className="value">{refund.requestTime}</span>
                        </div>
                      </div>

                      <div className="refund-reason">
                        <span className="reason-label">Reason:</span>
                        <span className="reason-value">
                          {refund.refundReason === "Other" && refund.customReason
                            ? refund.customReason
                            : refund.refundReason}
                        </span>
                      </div>
                    </div>

                    <div className="refund-card-footer">
                      <div className="status-description">
                        <p>{statusConfig.description}</p>
                      </div>

                      {refund.status === "denied" && (
                        <div className="denied-actions">
                          <button className="contact-support-button" onClick={handleContactSupport}>
                            <Mail size={16} />
                            Contact Support
                          </button>
                        </div>
                      )}

                      <div className="ticket-reference">
                        <span>Ticket Ref: {refund.ticketReference}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {refunds.length > 0 && (
          <div className="refunds-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Total Requests:</span>
                <span className="stat-value">{refunds.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pending:</span>
                <span className="stat-value requested">{refunds.filter((r) => r.status === "requested").length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Processing:</span>
                <span className="stat-value processing">{refunds.filter((r) => r.status === "processing").length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Completed:</span>
                <span className="stat-value refunded">{refunds.filter((r) => r.status === "refunded").length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Denied:</span>
                <span className="stat-value denied">{refunds.filter((r) => r.status === "denied").length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default RefundTrack
