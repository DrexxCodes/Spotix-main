"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import { auth, db } from "../services/firebase"
import { doc, getDoc, collection, addDoc, updateDoc, getDocs, setDoc } from "firebase/firestore"
import { XCircle, Loader2 } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "boxicons/css/boxicons.min.css"
import "../styles/payment-override.css"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// Define comprehensive interfaces for better type safety
interface PaymentDataFromLocalStorage {
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  eventCreatorId: string
  originalPrice?: number
  discountApplied?: boolean
  discountCode?: string
  eventVenue?: string
  eventType?: string
  eventDate?: string
  eventEndDate?: string
  eventStart?: string
  eventEnd?: string
  stopDate?: string
  enableStopDate?: boolean
  bookerName?: string
  bookerEmail?: string
  transactionFee?: number
  totalAmount?: number
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
  finalPrice: number
  discountApplied: boolean
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

const PaystackSuccess = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [eventData, setEventData] = useState<PaymentDataFromLocalStorage | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        console.log("Starting payment verification process")

        // Get reference from URL query parameters
        const searchParams = new URLSearchParams(location.search)
        const reference = searchParams.get("reference")
        const trxref = searchParams.get("trxref")

        console.log("URL parameters:", { reference, trxref })
        setDebugInfo(`Reference: ${reference}, TrxRef: ${trxref}`)

        if (!reference) {
          console.log("No reference found, redirecting to home")
          navigate("/home")
          return
        }

        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }


        // Get payment data from localStorage
        const paymentDataStr = localStorage.getItem("paystack_payment_data")
        if (!paymentDataStr) {
          setPaymentResult({
            success: false,
            message: "Payment data not found. Please try again.",
          })
          setLoading(false)
          return
        }

        const paymentData: PaymentDataFromLocalStorage = JSON.parse(paymentDataStr)
        setEventData(paymentData)
        console.log("Payment data loaded:", paymentData)

        if (!BACKEND_URL) {
          console.error("No active Spotix backend for confirmation")
          setPaymentResult({
            success: false,
            message: "Configuration error. Please contact support.",
          })
          setLoading(false)
          return
        }

        console.log("[v0] Making call to backend with ref=", `${reference}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        try {
          const response = await axios.get(`${BACKEND_URL}/api/payment/verify?reference=${reference}`, {
            signal: controller.signal,
            timeout: 30000,
          })
          clearTimeout(timeoutId)

          const data = response.data

          let isPaymentSuccessful = false

          if (data && typeof data === "object") {
            // Check multiple possible response structures
            if (data.status === true && data.data && data.data.status === "success") {
              isPaymentSuccessful = true
              console.log("[v0] Payment verified - Structure 1 (data.status && data.data.status)")
            } else if (data.status === "success") {
              isPaymentSuccessful = true
              console.log("[v0] Payment verified - Structure 2 (data.status === 'success')")
            } else if (data.data && data.data.status === "success") {
              isPaymentSuccessful = true
              console.log("[v0] Payment verified - Structure 3 (data.data.status === 'success')")
            } else if (data.success === true) {
              isPaymentSuccessful = true
              console.log("[v0] Payment verified - Structure 4 (data.success === true)")
            }
          }

          if (isPaymentSuccessful) {

            const ticketId = generateTicketId()
            const ticketReference = reference

            const now = new Date()
            const purchaseDate = now.toLocaleDateString()
            const purchaseTime = now.toLocaleTimeString()

            // Get user data
            const userDocRef = doc(db, "users", user.uid)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) {
              throw new Error("User data not found")
            }

            const userData = userDoc.data()

            const ticketData = {
              uid: user.uid,
              fullName: userData.fullName || "",
              email: userData.email || "",
              ticketType: paymentData.ticketType,
              ticketId,
              ticketReference,
              purchaseDate,
              purchaseTime,
              verified: false,
              paymentMethod: "Paystack",
              originalPrice: paymentData.originalPrice || paymentData.ticketPrice,
              ticketPrice: paymentData.ticketPrice,
              transactionFee: paymentData.transactionFee || 0,
              totalAmount: paymentData.totalAmount || paymentData.ticketPrice,
              discountApplied: paymentData.discountApplied || false,
              discountCode: paymentData.discountCode || null,
              eventVenue: paymentData.eventVenue || null,
              eventType: paymentData.eventType || null,
              eventDate: paymentData.eventDate || null,
              eventEndDate: paymentData.eventEndDate || null,
              eventStart: paymentData.eventStart || null,
              eventEnd: paymentData.eventEnd || null,
              ...(paymentData.stopDate ? { stopDate: paymentData.stopDate } : {}),
            }

            try {
              const attendeesCollectionRef = collection(
                db,
                "events",
                paymentData.eventCreatorId,
                "userEvents",
                paymentData.eventId,
                "attendees",
              )

              const attendeeDocRef = await addDoc(attendeesCollectionRef, ticketData)
              const consistentDocId = attendeeDocRef.id

              const ticketHistoryRef = doc(db, "TicketHistory", user.uid, "tickets", consistentDocId)
              await setDoc(ticketHistoryRef, {
                ...ticketData,
                eventId: paymentData.eventId,
                eventName: paymentData.eventName,
                eventCreatorId: paymentData.eventCreatorId,
              })

              // Update event statistics
              const eventDocRef = doc(db, "events", paymentData.eventCreatorId, "userEvents", paymentData.eventId)
              const eventDoc = await getDoc(eventDocRef)

              if (eventDoc.exists()) {
                const eventDataFromDb = eventDoc.data()
                await updateDoc(eventDocRef, {
                  ticketsSold: (eventDataFromDb.ticketsSold || 0) + 1,
                  totalRevenue: (eventDataFromDb.totalRevenue || 0) + Number(paymentData.ticketPrice),
                })

                const pricing = eventDataFromDb.pricing || []
                const updatedPricing = pricing.map((ticket: any) => {
                  if (ticket.ticketType === paymentData.ticketType && ticket.availableTickets > 0) {
                    return { ...ticket, availableTickets: ticket.availableTickets - 1 }
                  }
                  return ticket
                })
                await updateDoc(eventDocRef, {
                  pricing: updatedPricing,
                })
              }
            } catch (firestoreError) {
              console.error("Firestore operation failed:", firestoreError)
              throw new Error("Failed to save ticket data")
            }

            // Handle discount usage update
            if (paymentData.discountApplied && paymentData.discountCode) {
              try {
                const discountsCollectionRef = collection(
                  db,
                  "events",
                  paymentData.eventCreatorId,
                  "userEvents",
                  paymentData.eventId,
                  "discounts",
                )

                const discountsSnapshot = await getDocs(discountsCollectionRef)

                discountsSnapshot.forEach(async (doc) => {
                  const data = doc.data()
                  if (data.code === paymentData.discountCode) {
                    await updateDoc(doc.ref, {
                      usedCount: (data.usedCount || 0) + 1,
                    })
                  }
                })
              } catch (error) {
                console.error("Error updating discount usage:", error)
              }
            }

            // Mark reference as settled
            try {
              const referenceDocRef = doc(db, "references", user.uid, "userReferences", reference)
              const referenceDoc = await getDoc(referenceDocRef)

              if (referenceDoc.exists()) {
                await updateDoc(referenceDocRef, {
                  settled: true,
                  settledAt: now.toLocaleDateString(),
                  settledTime: now.toLocaleTimeString(),
                })
              } else {
              }
            } catch (error) {
              console.error("Error marking reference as settled:", error)
            }

            // Send confirmation email
            await sendConfirmationEmail(ticketId, ticketReference, userData, paymentData)

            // Prepare ticket data for navigation
            const ticketPagePaymentResult: TicketResultData = {
              success: true,
              message: "Payment successful",
              ticketId,
              ticketReference,
              userData: {
                fullName: userData.fullName || "",
                email: userData.email || "",
              },
              finalPrice: paymentData.ticketPrice,
              discountApplied: paymentData.discountApplied || false,
            }

            const ticketPageEventDetails: EventDetails = {
              eventVenue: paymentData.eventVenue || "",
              eventType: paymentData.eventType || "",
              eventDate: paymentData.eventDate || "",
              eventEndDate: paymentData.eventEndDate || "",
              eventStart: paymentData.eventStart || "",
              eventEnd: paymentData.eventEnd || "",
              stopDate: paymentData.stopDate,
              enableStopDate: paymentData.enableStopDate,
              bookerName: paymentData.bookerName,
              bookerEmail: paymentData.bookerEmail,
            }

            localStorage.removeItem("paystack_payment_data")

            // Navigate to ticket with data in state
            navigate("/ticket", {
              state: {
                paymentResult: ticketPagePaymentResult,
                paymentData: {
                  eventId: paymentData.eventId,
                  eventName: paymentData.eventName,
                  ticketType: paymentData.ticketType,
                  ticketPrice: paymentData.originalPrice || paymentData.ticketPrice,
                  eventCreatorId: paymentData.eventCreatorId,
                  finalPrice: paymentData.ticketPrice,
                  transactionFee: paymentData.transactionFee || 0,
                  totalAmount: paymentData.totalAmount || paymentData.ticketPrice,
                  appliedDiscount: paymentData.discountApplied
                    ? {
                        code: paymentData.discountCode || "",
                        type: "flat",
                        value: 0,
                        maxUses: 0,
                        usedCount: 0,
                        active: true,
                      }
                    : null,
                },
                eventDetails: ticketPageEventDetails,
                isFreeEvent: false,
                adjustedTransactionFee: paymentData.transactionFee || 0,
                adjustedTotalAmount: paymentData.totalAmount || paymentData.ticketPrice,
              },
            })
          } else {
            console.log("Payment verification failed. API response:", data)
            setPaymentResult({
              success: false,
              message: `Payment verification failed. ${data?.message || "Please contact support with this message if payment was deducted."}`,
            })
            setLoading(false)
            localStorage.removeItem("paystack_payment_data")
          }
        } catch (apiError: any) {
          clearTimeout(timeoutId)

          if (apiError.name === "AbortError") {
            console.error("API request timeout")
            setPaymentResult({
              success: false,
              message: "Request timeout. Please check your internet connection and try again.",
            })
          } else {
            console.error("API request failed:", apiError)
            setPaymentResult({
              success: false,
              message: `Network error: ${apiError.message || "Please check your internet connection."}`,
            })
          }
          setLoading(false)
          localStorage.removeItem("paystack_payment_data")
        }
      } catch (error: any) {
        console.error("Payment verification error:", error)
        setPaymentResult({
          success: false,
          message: `Verification error: ${error.message || "An unexpected error occurred."}`,
        })
        setLoading(false)
        localStorage.removeItem("paystack_payment_data")
      }
    }

    verifyPayment()
  }, [location, navigate])

  const sendConfirmationEmail = async (ticketId: string, ticketReference: string, userData: any, paymentData: any) => {
    if (!paymentData) return

    try {
      setEmailSending(true)

      const response = await fetch(`${BACKEND_URL}/api/mail/payment-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userData.email,
          name: userData.fullName || userData.username || "Valued Customer",
          ticket_ID: ticketId,
          event_host: paymentData.bookerName || "Event Host",
          event_name: paymentData.eventName,
          payment_ref: ticketReference,
          ticket_type: paymentData.ticketType,
          booker_email: paymentData.bookerEmail || "support@spotix.com.ng",
          ticket_price: paymentData.ticketPrice.toFixed(2),
          payment_method: "Paystack",
          event_venue: paymentData.eventVenue || "Not specified",
          event_date: paymentData.eventDate || "Not specified",
          event_start: paymentData.eventStart || "Not specified",
          event_end: paymentData.eventEnd || "Not specified",
          transaction_id: ticketReference,
          transaction_date: new Date().toLocaleDateString(),
          transaction_time: new Date().toLocaleTimeString(),
        }),
      })

      if (response.ok) {
        setEmailSent(true)
      } else {
        console.error("Failed to send confirmation email:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error sending confirmation email:", error)
    } finally {
      setEmailSending(false)
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

  const handleGoHome = () => {
    navigate("/home")
  }

  const handleViewTickets = () => {
    navigate("/ticket-history")
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  if (paymentResult && !paymentResult.success) {
    return (
      <>
        <UserHeader />
        <div className="payment-result">
          <div className="payment-failed">
            <div className="error-icon">
              <XCircle size={60} className="text-red-500" />
            </div>
            <h2>Payment Failed</h2>
            <p className="error-message">{paymentResult?.message || "Payment verification failed"}</p>
            {debugInfo && (
              <div className="debug-info" style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
                Debug: {debugInfo}
              </div>
            )}
            <div className="button-group" style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button className="close-dialog-btn" onClick={handleGoHome}>
                Back to Home
              </button>
              <button
                className="close-dialog-btn"
                onClick={() => navigate("/references")}
                style={{ backgroundColor: "#6b2fa5" }}
              >
                Check References
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // This component should ideally not render anything if successful, as it navigates away.
  // However, for development/debugging, I will keep a light message cos why not?.
  return (
    <>
      <UserHeader />
      <div className="payment-result">
        <div className="payment-processing">
          <h2>Redirecting to Ticket...</h2>
          <p>Your payment was successful. Please wait while we prepare your ticket details.</p>
          <Loader2 className="animate-spin text-6xl text-green-500 mx-auto my-8" />
        </div>
      </div>
      <Footer />
    </>
  )
}

export default PaystackSuccess
