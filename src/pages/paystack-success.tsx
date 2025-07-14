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
  ticketPrice: number // This is the final price paid
  eventCreatorId: string
  originalPrice?: number // Original price before discount
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
  // Add transactionFee and totalAmount if they are part of Paystack flow
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
  finalPrice: number // This is the ticketPrice from paymentData
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
  const [eventData, setEventData] = useState<PaymentDataFromLocalStorage | null>(null) // Renamed to eventData for clarity
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get reference from URL query parameters
        const searchParams = new URLSearchParams(location.search)
        const reference = searchParams.get("reference")
        const trxref = searchParams.get("trxref")

        if (!reference) {
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
          setLoading(false)
          return
        }

        const paymentData: PaymentDataFromLocalStorage = JSON.parse(paymentDataStr)
        setEventData(paymentData)

        // Verify payment on the server
        const response = await axios.get(`${BACKEND_URL}/api/payment/verify?reference=${reference}`)
        const data = response.data

        if (data.status && data.data && data.data.status === "success") {
          // Generate ticket ID and reference
          const ticketId = generateTicketId()
          const ticketReference = reference

          // Get current date and time
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

          // Prepare ticket data with discount information and event details
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
            transactionFee: paymentData.transactionFee || 0, // Assuming 0 if not explicitly passed
            totalAmount: paymentData.totalAmount || paymentData.ticketPrice, // Assuming ticketPrice is total if not explicitly passed
            discountApplied: paymentData.discountApplied || false,
            discountCode: paymentData.discountCode || null,
            // Add event details with null checks to avoid undefined values
            eventVenue: paymentData.eventVenue || null,
            eventType: paymentData.eventType || null,
            eventDate: paymentData.eventDate || null,
            eventEndDate: paymentData.eventEndDate || null,
            eventStart: paymentData.eventStart || null,
            eventEnd: paymentData.eventEnd || null,
            // Only include stopDate if it exists
            ...(paymentData.stopDate ? { stopDate: paymentData.stopDate } : {}),
          }

          // Add to attendees collection for the event first and get the document ID
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

          // Add to user's ticket history using the same document ID
          const ticketHistoryRef = doc(db, "TicketHistory", user.uid, "tickets", consistentDocId)
          await setDoc(ticketHistoryRef, {
            ...ticketData,
            eventId: paymentData.eventId,
            eventName: paymentData.eventName,
            eventCreatorId: paymentData.eventCreatorId,
          })

          // Update event stats (increment tickets sold and revenue)
          const eventDocRef = doc(db, "events", paymentData.eventCreatorId, "userEvents", paymentData.eventId)

          const eventDoc = await getDoc(eventDocRef)
          if (eventDoc.exists()) {
            const eventDataFromDb = eventDoc.data()
            await updateDoc(eventDocRef, {
              ticketsSold: (eventDataFromDb.ticketsSold || 0) + 1,
              totalRevenue: (eventDataFromDb.totalRevenue || 0) + Number(paymentData.ticketPrice),
            })

            // Update availableTickets for the specific ticket type
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

          // If a discount was applied, update its usage count
          if (paymentData.discountApplied && paymentData.discountCode) {
            try {
              // Find the discount document
              const discountsCollectionRef = collection(
                db,
                "events",
                paymentData.eventCreatorId,
                "userEvents",
                paymentData.eventId,
                "discounts",
              )

              // Get all discounts to find the one to update
              const discountsSnapshot = await getDocs(discountsCollectionRef)

              discountsSnapshot.forEach(async (doc) => {
                const data = doc.data()
                if (data.code === paymentData.discountCode) {
                  // Update the used count
                  await updateDoc(doc.ref, {
                    usedCount: (data.usedCount || 0) + 1,
                  })
                }
              })
            } catch (error) {
              console.error("Error updating discount usage:", error)
            }
          }

          // Send confirmation email
          await sendConfirmationEmail(ticketId, ticketReference, userData, paymentData)

          // Prepare data for ticket.tsx
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

          // Clear the payment data from localStorage
          localStorage.removeItem("paystack_payment_data")

          // Navigate to ticket page
          navigate("/ticket", {
            state: {
              paymentResult: ticketPagePaymentResult,
              paymentData: {
                eventId: paymentData.eventId,
                eventName: paymentData.eventName,
                ticketType: paymentData.ticketType,
                ticketPrice: paymentData.originalPrice || paymentData.ticketPrice, // Use originalPrice if available
                eventCreatorId: paymentData.eventCreatorId,
                finalPrice: paymentData.ticketPrice, // Final price after discount
                transactionFee: paymentData.transactionFee || 0,
                totalAmount: paymentData.totalAmount || paymentData.ticketPrice,
                appliedDiscount: paymentData.discountApplied
                  ? {
                      code: paymentData.discountCode || "",
                      type: "flat", // Assuming flat for simplicity, adjust if type is stored
                      value: 0, // Discount value not directly available here, might need to fetch or store
                      maxUses: 0,
                      usedCount: 0,
                      active: true,
                    }
                  : null,
              },
              eventDetails: ticketPageEventDetails,
              isFreeEvent: false, // Paystack is for paid events
              adjustedTransactionFee: paymentData.transactionFee || 0,
              adjustedTotalAmount: paymentData.totalAmount || paymentData.ticketPrice,
            },
          })
        } else {
          setPaymentResult({
            success: false,
            message: "Payment verification failed",
          })
          setLoading(false)
          localStorage.removeItem("paystack_payment_data")
        }
      } catch (error) {
        console.error("Error verifying payment:", error)
        setPaymentResult({
          success: false,
          message: "An error occurred during payment verification",
        })
        setLoading(false)
        localStorage.removeItem("paystack_payment_data")
      }
    }

    verifyPayment()
  }, [location, navigate])

  // Send confirmation email
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
          transaction_id: ticketReference, // Using Paystack reference as transaction ID
          transaction_date: new Date().toLocaleDateString(),
          transaction_time: new Date().toLocaleTimeString(),
        }),
      })

      if (response.ok) {
        setEmailSent(true)
      } else {
        console.error("Failed to send confirmation email")
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

    // Insert the random letters at random positions in the numbers
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

  // If payment failed, display the error message
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
            <button className="close-dialog-btn" onClick={handleGoHome}>
              Back to Home
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // This component should ideally not render anything if successful, as it navigates away.
  // However, for development/debugging, you might keep a minimal message.
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
