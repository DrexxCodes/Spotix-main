"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import { auth, db } from "../services/firebase"
import { doc, getDoc, collection, addDoc, updateDoc, getDocs } from "firebase/firestore"
import { CheckCircle, XCircle, Share2 } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "boxicons/css/boxicons.min.css"
import "../components/payment-override.css"

const PaystackSuccess = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [eventData, setEventData] = useState<any>(null)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

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

        const paymentData = JSON.parse(paymentDataStr)
        setEventData(paymentData)

        // Verify payment on the server
        const response = await axios.get(`https://spotix-backend.onrender.com/api/payment/verify?reference=${reference}`)
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

          // Add to attendees collection for the event
          const attendeesCollectionRef = collection(
            db,
            "events",
            paymentData.eventCreatorId,
            "userEvents",
            paymentData.eventId,
            "attendees",
          )

          await addDoc(attendeesCollectionRef, ticketData)

          // Add to user's ticket history
          const ticketHistoryRef = collection(db, "TicketHistory", user.uid, "tickets")
          await addDoc(ticketHistoryRef, {
            ...ticketData,
            eventId: paymentData.eventId,
            eventName: paymentData.eventName,
            eventCreatorId: paymentData.eventCreatorId,
          })

          // Update event stats (increment tickets sold and revenue)
          const eventDocRef = doc(db, "events", paymentData.eventCreatorId, "userEvents", paymentData.eventId)

          const eventDoc = await getDoc(eventDocRef)
          if (eventDoc.exists()) {
            const eventData = eventDoc.data()
            await updateDoc(eventDocRef, {
              ticketsSold: (eventData.ticketsSold || 0) + 1,
              totalRevenue: (eventData.totalRevenue || 0) + Number(paymentData.ticketPrice),
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

          setPaymentResult({
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
          })
        } else {
          setPaymentResult({
            success: false,
            message: "Payment verification failed",
          })
        }

        // Clear the payment data from localStorage
        localStorage.removeItem("paystack_payment_data")
        setLoading(false)
      } catch (error) {
        console.error("Error verifying payment:", error)
        setPaymentResult({
          success: false,
          message: "An error occurred during payment verification",
        })
        setLoading(false)
      }
    }

    verifyPayment()
  }, [location, navigate])

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

  const handleShare = () => {
    setShowShareOptions(!showShareOptions)
  }

  const shareToSocialMedia = (platform: string) => {
    const eventName = eventData?.eventName || "this event"
    const shareText = `Hey friends! I just got a ticket to ${eventName} from Spotix! Get yours here: `

    let shareUrl = ""

    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + window.location.origin + "/event/" + eventData?.eventCreatorId + "/" + eventData?.eventId)}`
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.origin + "/event/" + eventData?.eventCreatorId + "/" + eventData?.eventId)}`
        break
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + "/event/" + eventData?.eventCreatorId + "/" + eventData?.eventId)}`
        break
      default:
        break
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank")
    }

    setShowShareOptions(false)
  }

  const copyShareLink = () => {
    const eventName = eventData?.eventName || "this event"
    const shareText = `Hey friends! I just got a ticket to ${eventName} from Spotix! Get yours here: ${window.location.origin}/event/${eventData?.eventCreatorId}/${eventData?.eventId}`

    navigator.clipboard.writeText(shareText).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <UserHeader />
      <div className="payment-result">
        {paymentResult?.success ? (
          <div className="payment-success">
            <div className="success-icon">
              <CheckCircle size={60} className="text-green-500" />
            </div>
            <h2>Payment Successful!</h2>

            <img src="/paystack-200.svg" alt="Paystack Success" className="mx-auto my-4 w-32 h-32" />

            <p className="text-center text-gray-700 mb-6">
              Congratulations! Your payment has been completed successfully. A receipt has been sent to your email.
            </p>

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
                  <span>{eventData?.eventName}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Venue:</span>
                  <span>{eventData?.eventVenue || "Not specified"}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Date:</span>
                  <span>
                    {eventData?.eventDate ? new Date(eventData.eventDate).toLocaleDateString() : "Not specified"}
                  </span>
                </div>
                <div className="ticket-detail-row">
                  <span>Ticket Type:</span>
                  <span>{eventData?.ticketType}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Ticket ID:</span>
                  <span className="ticket-id">{paymentResult.ticketId}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Reference:</span>
                  <span>{paymentResult.ticketReference}</span>
                </div>
                {paymentResult.discountApplied && (
                  <div className="ticket-detail-row">
                    <span>Discount Applied:</span>
                    <span>{eventData?.discountCode}</span>
                  </div>
                )}
                <div className="ticket-detail-row">
                  <span>Amount Paid:</span>
                  <span>₦{paymentResult.finalPrice?.toFixed(2)}</span>
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
            <h2>Payment Failed</h2>
            <p className="error-message">{paymentResult?.message || "Payment verification failed"}</p>
            <button className="close-dialog-btn" onClick={handleGoHome}>
              Back to Home
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default PaystackSuccess
