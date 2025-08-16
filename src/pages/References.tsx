"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, query, getDocs, doc, updateDoc, orderBy, addDoc, setDoc, getDoc } from "firebase/firestore"
import { CheckCircle, Clock, AlertCircle, Loader2, CreditCard, Calendar, Tag, DollarSign } from "lucide-react"
import axios from "axios"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "boxicons/css/boxicons.min.css"

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string
        email: string
        amount: number
        currency: string
        ref: string
        metadata?: any
        callback: (response: { reference: string }) => void
        onClose: () => void
      }) => {
        openIframe: () => void
      }
    }
  }
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

interface ReferenceData {
  id: string
  reference: string
  eventName: string
  ticketType: string
  ticketPrice: number
  transactionFee: number
  totalAmount: number
  eventId: string
  eventCreatorId: string
  originalPrice: number
  discountApplied: boolean
  discountCode?: string
  eventVenue?: string
  eventType?: string
  eventDate?: string
  eventEndDate?: string
  eventStart?: string
  eventEnd?: string
  stopDate?: string
  bookerName?: string
  bookerEmail?: string
  userFullName: string
  userEmail: string
  createdAt: string
  createdTime: string
  settled?: boolean
  settledAt?: string
  settledTime?: string
  deleted?: boolean
  deletedAt?: string
  deletedTime?: string
}

const References = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [references, setReferences] = useState<ReferenceData[]>([])
  const [settlingReference, setSettlingReference] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paystackInitialized, setPaystackInitialized] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalReference, setModalReference] = useState<ReferenceData | null>(null)

  useEffect(() => {
    const loadScript = () => {
      const script = document.createElement("script")
      script.src = "https://js.paystack.co/v1/inline.js"
      script.async = true
      script.defer = true

      script.onload = () => {
        setPaystackInitialized(true)
      }

      script.onerror = () => {
        console.error("Failed to load Paystack script")
      }

      document.body.appendChild(script)

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }

    loadScript()
  }, [])

  useEffect(() => {
    fetchReferences()
  }, [])

  const fetchReferences = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      const referencesCollectionRef = collection(db, "references", user.uid, "userReferences")
      const q = query(referencesCollectionRef, orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)

      const referencesData: ReferenceData[] = []
      querySnapshot.forEach((doc) => {
        referencesData.push({
          id: doc.id,
          ...doc.data(),
        } as ReferenceData)
      })

      setReferences(referencesData)
    } catch (error) {
      console.error("Error fetching references:", error)
      setError("Failed to load payment references")
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const generateTicketId = () => {
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000).toString()
    const randomLetters = Math.random().toString(36).substring(2, 4).toUpperCase()

    const pos1 = Math.floor(Math.random() * 8)
    const pos2 = Math.floor(Math.random() * 7) + pos1 + 1

    const part1 = randomNumbers.substring(0, pos1)
    const part2 = randomNumbers.substring(pos1, pos2)
    const part3 = randomNumbers.substring(pos2)

    return `SPTX-TX-${part1}${randomLetters[0]}${part2}${randomLetters[1]}${part3}`
  }

  const handleSettle = async (referenceData: ReferenceData) => {
    setSettlingReference(referenceData.reference)
    setError(null)

    try {
      const response = await axios.get(`${BACKEND_URL}/api/payment/verify?reference=${referenceData.reference}`)
      const data = response.data

      if (data.status && data.data && data.data.status === "success") {
        await createTicketAndSettle(referenceData)
      } else {
        setModalReference(referenceData)
        setShowModal(true)
      }
    } catch (error) {
      console.error("Error verifying payment:", error)
      setError("Failed to verify payment. Please try again.")
    } finally {
      setSettlingReference(null)
    }
  }

  const createTicketAndSettle = async (referenceData: ReferenceData) => {
    try {
      const user = auth.currentUser
      if (!user) return

      const ticketId = generateTicketId()
      const now = new Date()
      const purchaseDate = now.toLocaleDateString()
      const purchaseTime = now.toLocaleTimeString()

      const ticketData = {
        uid: user.uid,
        fullName: referenceData.userFullName,
        email: referenceData.userEmail,
        ticketType: referenceData.ticketType,
        ticketId,
        ticketReference: referenceData.reference,
        purchaseDate,
        purchaseTime,
        verified: false,
        paymentMethod: "Paystack",
        originalPrice: referenceData.originalPrice,
        ticketPrice: referenceData.ticketPrice,
        transactionFee: referenceData.transactionFee,
        totalAmount: referenceData.totalAmount,
        discountApplied: referenceData.discountApplied,
        discountCode: referenceData.discountCode || null,
        eventVenue: referenceData.eventVenue || null,
        eventType: referenceData.eventType || null,
        eventDate: referenceData.eventDate || null,
        eventEndDate: referenceData.eventEndDate || null,
        eventStart: referenceData.eventStart || null,
        eventEnd: referenceData.eventEnd || null,
        ...(referenceData.stopDate ? { stopDate: referenceData.stopDate } : {}),
      }

      const attendeesCollectionRef = collection(
        db,
        "events",
        referenceData.eventCreatorId,
        "userEvents",
        referenceData.eventId,
        "attendees",
      )
      const attendeeDocRef = await addDoc(attendeesCollectionRef, ticketData)

      const ticketHistoryRef = doc(db, "TicketHistory", user.uid, "tickets", attendeeDocRef.id)
      await setDoc(ticketHistoryRef, {
        ...ticketData,
        eventId: referenceData.eventId,
        eventName: referenceData.eventName,
        eventCreatorId: referenceData.eventCreatorId,
      })

      const eventDocRef = doc(db, "events", referenceData.eventCreatorId, "userEvents", referenceData.eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (eventDoc.exists()) {
        const eventDataFromDb = eventDoc.data()
        await updateDoc(eventDocRef, {
          ticketsSold: (eventDataFromDb.ticketsSold || 0) + 1,
          totalRevenue: (eventDataFromDb.totalRevenue || 0) + Number(referenceData.ticketPrice),
        })

        const pricing = eventDataFromDb.pricing || []
        const updatedPricing = pricing.map((ticket: any) => {
          if (ticket.ticketType === referenceData.ticketType && ticket.availableTickets > 0) {
            return { ...ticket, availableTickets: ticket.availableTickets - 1 }
          }
          return ticket
        })
        await updateDoc(eventDocRef, { pricing: updatedPricing })
      }

      const referenceDocRef = doc(db, "references", user.uid, "userReferences", referenceData.id)
      await updateDoc(referenceDocRef, {
        settled: true,
        settledAt: now.toLocaleDateString(),
        settledTime: now.toLocaleTimeString(),
      })

      navigate("/ticket", {
        state: {
          paymentResult: {
            success: true,
            message: "Payment successful",
            ticketId,
            ticketReference: referenceData.reference,
            userData: {
              fullName: referenceData.userFullName,
              email: referenceData.userEmail,
            },
          },
          paymentData: {
            eventId: referenceData.eventId,
            eventName: referenceData.eventName,
            ticketType: referenceData.ticketType,
            ticketPrice: referenceData.originalPrice,
            eventCreatorId: referenceData.eventCreatorId,
            finalPrice: referenceData.ticketPrice,
            transactionFee: referenceData.transactionFee,
            totalAmount: referenceData.totalAmount,
            appliedDiscount: referenceData.discountApplied
              ? {
                  code: referenceData.discountCode || "",
                  type: "flat",
                  value: 0,
                  maxUses: 0,
                  usedCount: 0,
                  active: true,
                }
              : null,
          },
          eventDetails: {
            eventVenue: referenceData.eventVenue || "",
            eventType: referenceData.eventType || "",
            eventDate: referenceData.eventDate || "",
            eventEndDate: referenceData.eventEndDate || "",
            eventStart: referenceData.eventStart || "",
            eventEnd: referenceData.eventEnd || "",
            stopDate: referenceData.stopDate,
            bookerName: referenceData.bookerName,
            bookerEmail: referenceData.bookerEmail,
          },
          isFreeEvent: false,
          adjustedTransactionFee: referenceData.transactionFee,
          adjustedTotalAmount: referenceData.totalAmount,
        },
      })
    } catch (error) {
      console.error("Error creating ticket:", error)
      setError("Failed to create ticket. Please try again.")
    }
  }

  const retryPayment = async (referenceData: ReferenceData) => {
    if (!paystackInitialized) {
      setError("Paystack is not ready. Please refresh the page and try again.")
      return
    }

    try {
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: referenceData.userEmail,
        amount: Math.round(referenceData.totalAmount * 100),
        currency: "NGN",
        ref: referenceData.reference,
        callback: (response) => {
          console.log("Payment successful:", response.reference)
          createTicketAndSettle(referenceData).catch((error) => {
            console.error("Error creating ticket:", error)
            setError("Failed to create ticket. Please try again.")
          })
        },
        onClose: () => {
          console.log("Payment window closed")
        },
      })

      handler.openIframe()
    } catch (error) {
      console.error("Error retrying payment:", error)
      setError("Failed to open payment window. Please try again.")
    }
  }

  const deleteReference = async (referenceData: ReferenceData) => {
    try {
      const user = auth.currentUser
      if (!user) return

      const referenceDocRef = doc(db, "references", user.uid, "userReferences", referenceData.id)
      await updateDoc(referenceDocRef, {
        deleted: true,
        deletedAt: new Date().toLocaleDateString(),
        deletedTime: new Date().toLocaleTimeString(),
      })

      setReferences((prev) => prev.filter((ref) => ref.id !== referenceData.id))
      setShowModal(false)
      setModalReference(null)
    } catch (error) {
      console.error("Error deleting reference:", error)
      setError("Failed to delete reference. Please try again.")
    }
  }

  const handleRetryPayment = () => {
    if (modalReference) {
      setShowModal(false)
      retryPayment(modalReference)
      setModalReference(null)
    }
  }

  const handleDeleteReference = () => {
    if (modalReference) {
      deleteReference(modalReference)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setModalReference(null)
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <Helmet>
        <title>Payment References - Spotix</title>
        <meta name="description" content="Manage your incomplete payment transactions on Spotix." />
      </Helmet>
      <UserHeader />
      <div className="references-page-container">
        <div className="references-header">
          <h1>Payment References</h1>
          <p>Manage your incomplete payment transactions</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {references.length === 0 ? (
          <div className="no-references">
            <CreditCard size={48} className="no-references-icon" />
            <h3>No Payment References</h3>
            <p>You don't have any incomplete payment transactions.</p>
            <button className="go-home-btn" onClick={() => navigate("/home")}>
              Go to Home
            </button>
          </div>
        ) : (
          <div className="references-list">
            {references.map((reference) => (
              <div key={reference.id} className="reference-card">
                <div className="reference-header">
                  <div className="reference-info">
                    <h3>{reference.eventName}</h3>
                    <div className="reference-meta">
                      <span className="reference-date">
                        <Calendar size={14} />
                        {formatDate(reference.createdAt)} at {reference.createdTime}
                      </span>
                      <span className="reference-id">Ref: {reference.reference}</span>
                    </div>
                  </div>
                  <div className={`reference-status ${reference.settled ? "settled" : "pending"}`}>
                    {reference.settled ? (
                      <>
                        <CheckCircle size={16} />
                        Settled
                      </>
                    ) : (
                      <>
                        <Clock size={16} />
                        Pending
                      </>
                    )}
                  </div>
                </div>

                <div className="reference-details">
                  <div className="reference-detail">
                    <Tag size={14} />
                    <span>Ticket Type: {reference.ticketType}</span>
                  </div>
                  <div className="reference-detail">
                    <DollarSign size={14} />
                    <span>Total Amount: NGN {formatNumber(reference.totalAmount)}</span>
                  </div>
                  {reference.discountApplied && (
                    <div className="reference-detail discount">
                      <span>Discount Applied: {reference.discountCode}</span>
                    </div>
                  )}
                </div>

                {reference.settled && (
                  <div className="settlement-info">
                    <span>
                      Settled on {formatDate(reference.settledAt || "")} at {reference.settledTime}
                    </span>
                  </div>
                )}

                <div className="reference-actions">
                  {reference.settled ? (
                    <button className="settle-btn settled" disabled>
                      <CheckCircle size={16} />
                      Settled
                    </button>
                  ) : (
                    <button
                      className="settle-btn active"
                      onClick={() => handleSettle(reference)}
                      disabled={settlingReference === reference.reference}
                    >
                      {settlingReference === reference.reference ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Settling...
                        </>
                      ) : (
                        <>
                          <CreditCard size={16} />
                          Settle
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && modalReference && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payment Not Completed</h3>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                The transaction for <strong>{modalReference.eventName}</strong> wasn't completed on Paystack.
              </p>
              <p>What would you like to do?</p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn retry-btn" onClick={handleRetryPayment}>
                <CreditCard size={16} />
                Complete Payment
              </button>
              <button className="modal-btn delete-btn" onClick={handleDeleteReference}>
                <AlertCircle size={16} />
                Delete Reference
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />

      <style>{`
        .references-page-container {
          min-height: 100vh;
          padding: 2rem 1rem;
          max-width: 800px;
          margin: 0 auto;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .references-header {
          text-align: center;
          margin-bottom: 2rem;
          color: white;
        }

        .references-header h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .references-header p {
          opacity: 0.9;
          font-size: 1.1rem;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #dc2626;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .no-references {
          text-align: center;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 3rem 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .no-references-icon {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .no-references h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .no-references p {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .go-home-btn {
          background: #6b2fa5;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .go-home-btn:hover {
          background: #5a2589;
          transform: translateY(-1px);
        }

        .references-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .reference-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .reference-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .reference-info h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .reference-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .reference-date {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .reference-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .reference-status.settled {
          background: rgba(34, 197, 94, 0.1);
          color: #166534;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .reference-status.pending {
          background: rgba(251, 146, 60, 0.1);
          color: #ea580c;
          border: 1px solid rgba(251, 146, 60, 0.3);
        }

        .reference-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .reference-detail {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #4b5563;
        }

        .reference-detail.discount {
          color: #059669;
          font-weight: 500;
        }

        .settlement-info {
          font-size: 0.875rem;
          color: #059669;
          margin-bottom: 1rem;
          font-style: italic;
        }

        .reference-actions {
          display: flex;
          justify-content: flex-end;
        }

        .settle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .settle-btn.active {
          background: #6b2fa5;
          color: white;
        }

        .settle-btn.active:hover {
          background: #5a2589;
          transform: translateY(-1px);
        }

        .settle-btn.settled {
          background: #059669;
          color: white;
          cursor: not-allowed;
        }

        .settle-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.5rem 0;
        }

        .modal-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #374151;
        }

        .modal-body {
          padding: 1rem 1.5rem;
        }

        .modal-body p {
          color: #6b7280;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }

        .modal-body p:last-child {
          margin-bottom: 0;
          font-weight: 500;
          color: #374151;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          background: #f9fafb;
        }

        .modal-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .retry-btn {
          background: #6b2fa5;
          color: white;
        }

        .retry-btn:hover {
          background: #5a2589;
          transform: translateY(-1px);
        }

        .delete-btn {
          background: #ef4444;
          color: white;
        }

        .delete-btn:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .references-page-container {
            padding: 1rem 0.5rem;
          }

          .reference-header {
            flex-direction: column;
            gap: 1rem;
          }

          .reference-status {
            align-self: flex-start;
          }

          .reference-meta {
            font-size: 0.8rem;
          }

          .modal-actions {
            flex-direction: column;
          }

          .modal-btn {
            width: 100%;
          }
        }
      `}</style>
    </>
  )
}

export default References
