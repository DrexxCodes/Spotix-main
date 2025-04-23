"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore"
import { CheckCircle, XCircle, Loader2, AlertCircle, Bitcoin, Tag, Share2 } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "boxicons/css/boxicons.min.css"
import "../styles/payment-override.css"

interface PaymentPageProps {
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  eventCreatorId: string
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
}

const Payment = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState<string>("wallet")
  const [paymentStarted, setPaymentStarted] = useState(false)
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paymentData, setPaymentData] = useState<PaymentPageProps | null>(null)
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [showBitcoinDialog, setShowBitcoinDialog] = useState(false)
  const [paystackError, setPaystackError] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState("")
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountData | null>(null)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [finalPrice, setFinalPrice] = useState<number>(0)
  const [paystackInitialized, setPaystackInitialized] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>("")
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // Payment process states
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [stepStatus, setStepStatus] = useState<"loading" | "success" | "error" | null>(null)
  const [walletBalance, setWalletBalance] = useState<number>(0)

  // Add PaystackPop script to the document
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true

    script.onload = () => {
      setPaystackInitialized(true)
    }

    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true // Add a flag to track component mount status

    // Get payment data from location state
    if (location.state) {
      if (isMounted) {
        const paymentInfo = location.state as PaymentPageProps
        setPaymentData(paymentInfo)
        setFinalPrice(paymentInfo.ticketPrice)

        // Fetch event details
        fetchEventDetails(paymentInfo.eventCreatorId, paymentInfo.eventId)

        setLoading(false)
      }
    } else {
      // If no payment data, redirect to home
      navigate("/")
    }

    // Fetch user's wallet balance
    const fetchWalletBalance = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (isMounted) {
            setWalletBalance(userData.wallet || 0)
          }
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error)
      }
    }

    fetchWalletBalance()

    // Set up share URL
    if (paymentData) {
      const baseUrl = window.location.origin
      setShareUrl(`${baseUrl}/event/${paymentData.eventCreatorId}/${paymentData.eventId}`)
    }

    return () => {
      isMounted = false // Set the flag to false when the component unmounts
    }
  }, [location, navigate])

  // Fetch event details
  const fetchEventDetails = async (creatorId: string, eventId: string) => {
    try {
      const eventDocRef = doc(db, "events", creatorId, "userEvents", eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (eventDoc.exists()) {
        const data = eventDoc.data()
        setEventDetails({
          eventVenue: data.eventVenue || "",
          eventType: data.eventType || "",
          eventDate: data.eventDate || "",
          eventEndDate: data.eventEndDate || "",
          eventStart: data.eventStart || "",
          eventEnd: data.eventEnd || "",
          stopDate: data.enableStopDate ? data.stopDate : undefined,
          enableStopDate: data.enableStopDate || false,
        })
      }
    } catch (error) {
      console.error("Error fetching event details:", error)
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

  const generateReference = () => {
    const letters = Math.random().toString(36).substring(2, 8).toUpperCase()
    const numbers = Math.floor(1000 + Math.random() * 9000).toString()
    return `${letters}${numbers}`
  }

  // Calculate the discounted price based on discount type and value
  const calculateDiscountedPrice = (originalPrice: number, discount: DiscountData): number => {
    if (discount.type === "percentage") {
      // Apply percentage discount (ensure it doesn't exceed 100%)
      const discountRate = Math.min(discount.value, 100) / 100
      return originalPrice * (1 - discountRate)
    } else {
      // Apply flat discount (ensure it doesn't go below zero)
      return Math.max(0, originalPrice - discount.value)
    }
  }

  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || !paymentData) return

    setDiscountLoading(true)
    setDiscountError(null)

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Query for the discount code
      const discountsCollectionRef = collection(
        db,
        "events",
        paymentData.eventCreatorId,
        "userEvents",
        paymentData.eventId,
        "discounts",
      )

      const q = query(discountsCollectionRef, where("code", "==", discountCode.trim()))

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setDiscountError("Invalid discount code")
        setDiscountLoading(false)
        return
      }

      // Get the discount data
      const discountDoc = querySnapshot.docs[0]
      const discountData = discountDoc.data() as DiscountData

      // Check if discount is active
      if (!discountData.active) {
        setDiscountError("This discount code is no longer active")
        setDiscountLoading(false)
        return
      }

      // Check if discount has reached max uses
      if (discountData.usedCount >= discountData.maxUses) {
        setDiscountError("This discount code has reached its maximum usage limit")
        setDiscountLoading(false)
        return
      }

      // Calculate the discounted price
      const discountedPrice = calculateDiscountedPrice(paymentData.ticketPrice, discountData)

      // Apply the discount
      setAppliedDiscount(discountData)
      setFinalPrice(discountedPrice)
    } catch (error) {
      console.error("Error applying discount:", error)
      setDiscountError("Failed to apply discount code")
    } finally {
      setDiscountLoading(false)
    }
  }

  const updateDiscountUsage = async () => {
    if (!appliedDiscount || !paymentData) return

    try {
      const user = auth.currentUser
      if (!user) return

      // Find the discount document
      const discountsCollectionRef = collection(
        db,
        "events",
        paymentData.eventCreatorId,
        "userEvents",
        paymentData.eventId,
        "discounts",
      )

      const q = query(discountsCollectionRef, where("code", "==", appliedDiscount.code))

      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const discountDoc = querySnapshot.docs[0]

        // Update the used count
        await updateDoc(discountDoc.ref, {
          usedCount: appliedDiscount.usedCount + 1,
        })
      }
    } catch (error) {
      console.error("Error updating discount usage:", error)
    }
  }

  // Initialize Paystack client-side
  const initializePaystack = () => {
    try {
      if (!paystackInitialized) {
        console.error("Paystack script not loaded yet")
        setPaystackError("Paystack is still loading. Please try again in a moment.")
        return
      }

      // Clear any previous errors
      setPaystackError(null)

      const user = auth.currentUser
      if (!user || !paymentData || !eventDetails) {
        throw new Error("User not authenticated or payment data missing")
      }

      const userDocRef = doc(db, "users", user.uid)
      getDoc(userDocRef)
        .then((userDoc) => {
          if (!userDoc.exists()) {
            setPaystackError("User data not found")
            return
          }

          const userData = userDoc.data()

          // Prepare payment metadata with discount information and event details
          const paymentMetadata = {
            userId: user.uid,
            eventId: paymentData.eventId,
            eventCreatorId: paymentData.eventCreatorId,
            ticketType: paymentData.ticketType,
            eventName: paymentData.eventName,
            originalPrice: paymentData.ticketPrice,
            ticketPrice: finalPrice,
            discountApplied: appliedDiscount ? true : false,
            discountCode: appliedDiscount ? appliedDiscount.code : null,
            discountType: appliedDiscount ? appliedDiscount.type : null,
            discountValue: appliedDiscount ? appliedDiscount.value : null,
            // Add event details
            eventVenue: eventDetails.eventVenue,
            eventType: eventDetails.eventType,
            eventDate: eventDetails.eventDate,
            eventEndDate: eventDetails.eventEndDate,
            eventStart: eventDetails.eventStart,
            eventEnd: eventDetails.eventEnd,
            stopDate: eventDetails.stopDate,
          }

          // Save payment data for the callback
          localStorage.setItem(
            "paystack_payment_data",
            JSON.stringify({
              ...paymentData,
              ticketPrice: finalPrice,
              originalPrice: paymentData.ticketPrice,
              discountApplied: appliedDiscount ? true : false,
              discountCode: appliedDiscount ? appliedDiscount.code : null,
              // Add event details with null checks
              eventVenue: eventDetails.eventVenue || null,
              eventType: eventDetails.eventType || null,
              eventDate: eventDetails.eventDate || null,
              eventEndDate: eventDetails.eventEndDate || null,
              eventStart: eventDetails.eventStart || null,
              eventEnd: eventDetails.eventEnd || null,
              // Only include stopDate if it exists
              ...(eventDetails.stopDate ? { stopDate: eventDetails.stopDate } : {}),
            }),
          )

          // Calculate amount in kobo (smallest currency unit)
          const amountInKobo = Math.round(finalPrice * 100)

          // @ts-ignore - PaystackPop is loaded from the script
          const handler = window.PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
            email: userData.email,
            amount: amountInKobo, // Convert to kobo
            currency: "NGN", // Nigerian Naira
            ref: generateReference(),
            metadata: paymentMetadata,
            callback: (response) => {
              // Handle success - this must be a regular function, not an arrow function
              if (appliedDiscount) {
                // Update discount usage in a separate call
                updateDiscountUsage()
                  .then(() => {
                    console.log("Discount usage updated")
                  })
                  .catch((err) => {
                    console.error("Error updating discount:", err)
                  })
              }

              // Redirect to success page
              window.location.href = `/paystack-success?reference=${response.reference}`
            },
            onClose: () => {
              // Handle when user closes payment modal
              console.log("Payment window closed")
            },
          })

          handler.openIframe()
        })
        .catch((error) => {
          console.error("Error getting user data:", error)
          setPaystackError("Failed to initialize payment. Please try again.")
        })
    } catch (error) {
      console.error("Error initializing Paystack payment:", error)
      setPaystackError("There was an error initializing Paystack. Please try again or use another payment method.")
    }
  }

  const handleStartPayment = async () => {
    if (!paymentData) return

    if (paymentMethod === "paystack") {
      // Use client-side Paystack initialization
      initializePaystack()
      return
    } else if (paymentMethod === "bitcoin") {
      setShowBitcoinDialog(true)
      return
    }

    setPaymentStarted(true)
    await processPayment(paymentData)
  }

  const processPayment = async (paymentData: PaymentPageProps) => {
    setCurrentStep("initializing")
    setStepStatus("loading")

    try {
      const user = auth.currentUser
      if (!user || !eventDetails) {
        throw new Error("User not authenticated or event details missing")
      }

      // Simulate initializing payment
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setStepStatus("success")

      // Read wallet
      setCurrentStep("reading")
      setStepStatus("loading")
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        throw new Error("User data not found")
      }

      const userData = userDoc.data()
      const walletBalance = userData.wallet || 0
      setStepStatus("success")

      // Charge wallet
      setCurrentStep("charging")
      setStepStatus("loading")
      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (walletBalance < finalPrice) {
        setStepStatus("error")
        setPaymentResult({
          success: false,
          message: "Insufficient funds in wallet",
        })
        return
      }

      // Update wallet balance
      const newBalance = walletBalance - finalPrice
      await updateDoc(userDocRef, {
        wallet: newBalance,
      })

      // Update discount usage if a discount was applied
      if (appliedDiscount) {
        await updateDiscountUsage()
      }

      setStepStatus("success")
      setCurrentStep("finalizing")
      setStepStatus("loading")

      // Generate ticket ID and reference
      const ticketId = generateTicketId()
      const ticketReference = generateReference()

      // Get current date and time
      const now = new Date()
      const purchaseDate = now.toLocaleDateString()
      const purchaseTime = now.toLocaleTimeString()

      // Find the section where we prepare the ticket data before adding to Firestore
      // Replace the ticket data preparation with this code that handles undefined values properly

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
        paymentMethod: "Wallet",
        originalPrice: paymentData.ticketPrice,
        ticketPrice: finalPrice,
        discountApplied: appliedDiscount ? true : false,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        discountType: appliedDiscount ? appliedDiscount.type : null,
        discountValue: appliedDiscount ? appliedDiscount.value : null,
        // Add event details with null checks to avoid undefined values
        eventVenue: eventDetails.eventVenue || null,
        eventType: eventDetails.eventType || null,
        eventDate: eventDetails.eventDate || null,
        eventEndDate: eventDetails.eventEndDate || null,
        eventStart: eventDetails.eventStart || null,
        eventEnd: eventDetails.eventEnd || null,
        // Only include stopDate if it exists
        ...(eventDetails.stopDate ? { stopDate: eventDetails.stopDate } : {}),
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
          totalRevenue: (eventData.totalRevenue || 0) + finalPrice,
        })
      }

      setStepStatus("success")

      setPaymentResult({
        success: true,
        message: "Payment successful",
        ticketId,
        ticketReference,
        userData: {
          fullName: userData.fullName || "",
          email: userData.email || "",
        },
      })
    } catch (error) {
      console.error("Payment processing error:", error)
      setStepStatus("error")
      setPaymentResult({
        success: false,
        message: "An error occurred during payment processing",
      })
    }
  }

  const handleGoHome = () => {
    navigate("/home")
  }

  const handleViewTickets = () => {
    navigate("/ticket-history")
  }

  const handleCloseBitcoinDialog = () => {
    setShowBitcoinDialog(false)
  }

  const handleShare = () => {
    setShowShareOptions(!showShareOptions)
  }

  const shareToSocialMedia = (platform: string) => {
    const eventName = paymentData?.eventName || "this event"
    const shareText = `Hey friends! I just got a ticket to ${eventName} from Spotix! Get yours here: `

    let shareUrl = ""

    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + window.location.origin + "/event/" + paymentData?.eventCreatorId + "/" + paymentData?.eventId)}`
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.origin + "/event/" + paymentData?.eventCreatorId + "/" + paymentData?.eventId)}`
        break
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + "/event/" + paymentData?.eventCreatorId + "/" + paymentData?.eventId)}`
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
    const eventName = paymentData?.eventName || "this event"
    const shareText = `Hey friends! I just got a ticket to ${eventName} from Spotix! Get yours here: ${window.location.origin}/event/${paymentData?.eventCreatorId}/${paymentData?.eventId}`

    navigator.clipboard.writeText(shareText).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  if (loading || !paymentData) {
    return <Preloader loading={true} />
  }

  // Calculate discount amount for display
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "percentage"
      ? (appliedDiscount.value / 100) * paymentData.ticketPrice
      : appliedDiscount.value
    : 0

  return (
    <>
      <UserHeader />
      <div className="payment-page-container">
        {!paymentStarted ? (
          <div className="payment-method-selection">
            <h2>Choose your payment method</h2>

            {/* Discount Code Section */}
            <div className="discount-code-section">
              <h3>Have a discount code?</h3>
              <div className="discount-input-container">
                <div className="discount-input-wrapper">
                  <Tag size={18} className="discount-icon" />
                  <input
                    type="text"
                    placeholder="Enter discount code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    disabled={!!appliedDiscount || discountLoading}
                    className="discount-input"
                  />
                </div>
                <button
                  className="apply-discount-btn"
                  onClick={handleApplyDiscount}
                  disabled={!discountCode.trim() || !!appliedDiscount || discountLoading}
                >
                  {discountLoading ? "Applying..." : "Apply"}
                </button>
              </div>

              {discountError && <p className="discount-error">{discountError}</p>}

              {appliedDiscount && (
                <div className="applied-discount">
                  <CheckCircle size={16} className="discount-success-icon" />
                  <p>
                    Discount applied:{" "}
                    {appliedDiscount.type === "percentage"
                      ? `${appliedDiscount.value}% off (₦${discountAmount.toFixed(2)})`
                      : `₦${appliedDiscount.value.toFixed(2)} off`}
                  </p>
                  <button
                    className="remove-discount-btn"
                    onClick={() => {
                      setAppliedDiscount(null)
                      setDiscountCode("")
                      setFinalPrice(paymentData.ticketPrice)
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="payment-methods">
              <div
                className={`payment-method ${paymentMethod === "wallet" ? "selected" : ""}`}
                onClick={() => setPaymentMethod("wallet")}
              >
                <div className="payment-method-icon">💰</div>
                <div className="payment-method-name">My Wallet</div>
                <div className="payment-method-balance">₦{walletBalance.toFixed(2)}</div>
              </div>
              <div
                className={`payment-method ${paymentMethod === "paystack" ? "selected" : ""}`}
                onClick={() => setPaymentMethod("paystack")}
              >
                <div className="payment-method-icon">💳</div>
                <div className="payment-method-name">Paystack</div>
                <div className="payment-method-description">Card Payment</div>
              </div>
              <div
                className={`payment-method ${paymentMethod === "bitcoin" ? "selected" : ""}`}
                onClick={() => setPaymentMethod("bitcoin")}
              >
                <div className="payment-method-icon">₿</div>
                <div className="payment-method-name">Bitcoin</div>
                <div className="payment-method-description">Crypto Payment</div>
              </div>
            </div>

            {paystackError && (
              <div className="payment-error-message">
                <AlertCircle size={16} className="error-icon" />
                <p>{paystackError}</p>
              </div>
            )}

            <div className="payment-summary">
              <h3>Payment Summary</h3>
              <div className="payment-summary-row">
                <span>Event:</span>
                <span>{paymentData.eventName}</span>
              </div>
              <div className="payment-summary-row">
                <span>Ticket Type:</span>
                <span>{paymentData.ticketType}</span>
              </div>

              {appliedDiscount && (
                <>
                  <div className="payment-summary-row original-price">
                    <span>Original Price:</span>
                    <span>₦{Number(paymentData.ticketPrice).toFixed(2)}</span>
                  </div>
                  <div className="payment-summary-row discount">
                    <span>Discount:</span>
                    <span>
                      {appliedDiscount.type === "percentage"
                        ? `${appliedDiscount.value}% (₦${discountAmount.toFixed(2)})`
                        : `₦${appliedDiscount.value.toFixed(2)}`}
                    </span>
                  </div>
                </>
              )}

              <div className="payment-summary-row total">
                <span>Total Price:</span>
                <span>₦{finalPrice.toFixed(2)}</span>
              </div>
            </div>
            <div className="payment-actions">
              <button className="cancel-payment-btn" onClick={handleGoHome}>
                Cancel
              </button>
              <button className="proceed-payment-btn" onClick={handleStartPayment}>
                Proceed to Payment
              </button>
            </div>
          </div>
        ) : paymentResult ? (
          <div className="payment-result">
            {paymentResult.success ? (
              <div className="payment-success">
                <div className="success-icon">
                  <CheckCircle size={60} className="text-green-500" />
                </div>
                <h2>Payment Successful!</h2>

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
                        {eventDetails?.eventDate
                          ? new Date(eventDetails.eventDate).toLocaleDateString()
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
                    {appliedDiscount && (
                      <div className="ticket-detail-row">
                        <span>Discount Applied:</span>
                        <span>{appliedDiscount.code}</span>
                      </div>
                    )}
                    <div className="ticket-detail-row">
                      <span>Amount Paid:</span>
                      <span>₦{finalPrice.toFixed(2)}</span>
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
                <p className="error-message">{paymentResult.message}</p>
                <button className="close-dialog-btn" onClick={handleGoHome}>
                  Back to Home
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="payment-processing">
            <h2>Processing Payment</h2>

            <div className="payment-steps">
              <div
                className={`payment-step ${currentStep === "initializing" ? "active" : ""} ${
                  currentStep === "initializing" && stepStatus === "success"
                    ? "completed"
                    : currentStep === "initializing" && stepStatus === "error"
                      ? "error"
                      : ""
                }`}
              >
                <div className="step-status">
                  {currentStep === "initializing" && stepStatus === "loading" && <Loader2 className="animate-spin" />}
                  {currentStep === "initializing" && stepStatus === "success" && (
                    <CheckCircle className="text-green-500" />
                  )}
                  {currentStep === "initializing" && stepStatus === "error" && <XCircle className="text-red-500" />}
                </div>
                <div className="step-label">Initializing Payment</div>
              </div>

              <div
                className={`payment-step ${currentStep === "reading" ? "active" : ""} ${
                  currentStep === "reading" && stepStatus === "success"
                    ? "completed"
                    : currentStep === "reading" && stepStatus === "error"
                      ? "error"
                      : ""
                }`}
              >
                <div className="step-status">
                  {currentStep === "reading" && stepStatus === "loading" && <Loader2 className="animate-spin" />}
                  {currentStep === "reading" && stepStatus === "success" && <CheckCircle className="text-green-500" />}
                  {currentStep === "reading" && stepStatus === "error" && <XCircle className="text-red-500" />}
                </div>
                <div className="step-label">Reading Wallet</div>
              </div>

              <div
                className={`payment-step ${currentStep === "charging" ? "active" : ""} ${
                  currentStep === "charging" && stepStatus === "success"
                    ? "completed"
                    : currentStep === "charging" && stepStatus === "error"
                      ? "error"
                      : ""
                }`}
              >
                <div className="step-status">
                  {currentStep === "charging" && stepStatus === "loading" && <Loader2 className="animate-spin" />}
                  {currentStep === "charging" && stepStatus === "success" && <CheckCircle className="text-green-500" />}
                  {currentStep === "charging" && stepStatus === "error" && <XCircle className="text-red-500" />}
                </div>
                <div className="step-label">Charging ₦{finalPrice.toFixed(2)} from Wallet</div>
              </div>

              <div
                className={`payment-step ${currentStep === "finalizing" ? "active" : ""} ${
                  currentStep === "finalizing" && stepStatus === "success" ? "completed" : ""
                } ${
                  currentStep === "finalizing" && stepStatus === "success"
                    ? "completed"
                    : currentStep === "finalizing" && stepStatus === "error"
                      ? "error"
                      : ""
                }`}
              >
                <div className="step-status">
                  {currentStep === "finalizing" && stepStatus === "loading" && <Loader2 className="animate-spin" />}
                  {currentStep === "finalizing" && stepStatus === "success" && (
                    <CheckCircle className="text-green-500" />
                  )}
                  {currentStep === "finalizing" && stepStatus === "error" && <XCircle className="text-red-500" />}
                </div>
                <div className="step-label">Finalizing Payment</div>
              </div>
            </div>

            <p className="processing-message">Please wait while we process your payment...</p>
          </div>
        )}

        {/* Bitcoin Unavailable Dialog */}
        {showBitcoinDialog && (
          <div className="paystack-dialog-overlay">
            <div className="paystack-dialog">
              <div className="dialog-header">
                <AlertCircle size={40} className="warning-icon" />
                <h3>Bitcoin Payment Unavailable</h3>
              </div>
              <p>
                We're sorry, but Bitcoin payment method is currently unavailable. Please use your Wallet or Paystack to
                complete this payment.
              </p>
              <button className="close-dialog-btn" onClick={handleCloseBitcoinDialog}>
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

export default Payment
