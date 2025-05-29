"use client"

import { useRef } from "react"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore"
import { CheckCircle, XCircle, Loader2, Mail, Share2, AlertTriangle } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "boxicons/css/boxicons.min.css"
import "../styles/payment-override.css"

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
  eventDetails: EventDetails | null
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

interface UserData {
  fullName?: string
  username?: string
  email?: string
  wallet?: number
}

interface TicketData {
  uid: string
  fullName: string
  email: string
  ticketType: string
  ticketId: string
  ticketReference: string
  purchaseDate: string
  purchaseTime: string
  verified: boolean
  paymentMethod: string
  originalPrice: number
  ticketPrice: number
  transactionFee: number
  totalAmount: number
  transactionId: string
  discountApplied: boolean
  discountCode: string | null
  discountType: string | null
  discountValue: number | null
  eventVenue: string
  eventType: string
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  bookerName: string
  bookerEmail: string
  stopDate?: string
  eventId?: string
  eventName?: string
  eventCreatorId?: string
}

// Create a logger utility for consistent logging
const Logger = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    console.log(`ℹ️ [${timestamp}] INFO: ${message}`, data || "")
  },
  success: (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    console.log(`✅ [${timestamp}] SUCCESS: ${message}`, data || "")
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    console.warn(`⚠️ [${timestamp}] WARNING: ${message}`, data || "")
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString()
    console.error(`❌ [${timestamp}] ERROR: ${message}`, error || "")
  },
  debug: (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    console.debug(`🔍 [${timestamp}] DEBUG: ${message}`, data || "")
  },
  state: (message: string, state?: any) => {
    const timestamp = new Date().toISOString()
    console.log(`📊 [${timestamp}] STATE: ${message}`, state || "")
  },
}

const Wallet = () => {
  // Component state
  const location = useLocation()
  const navigate = useNavigate()
  const [paymentStarted, setPaymentStarted] = useState(false)
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paymentData, setPaymentData] = useState<PaymentPageProps | null>(null)
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [shareUrl, setShareUrl] = useState<string>("")
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)

  // Payment process states
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [stepStatus, setStepStatus] = useState<"loading" | "success" | "error" | null>(null)

  // Transaction tracking to prevent duplicates
  const [transactionId, setTransactionId] = useState<string>("")
  const [transactionProcessed, setTransactionProcessed] = useState(false)

  // Error handling
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  // Refs to track mounted state and prevent memory leaks
  const isMounted = useRef(true)
  const retryCount = useRef(0)
  const MAX_RETRIES = 3

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
      Logger.info("IWSS Instance Unmounting")
    }
  }, [])

  // Initialize component with payment data
  useEffect(() => {
    Logger.info("IWSS Instance Mounted")

    const initializeComponent = async () => {
      try {
        // Validate location state
        if (!location.state) {
          Logger.error("No payment data found in location state")
          navigate("/")
          return
        }

        // Extract and validate payment data
        const paymentInfo = location.state as PaymentPageProps
        Logger.info("Payment data received", paymentInfo)

        // Check if we already have event details from the previous page
        if (paymentInfo.eventDetails) {
          Logger.info("IWSS object reading event details")
          setEventDetails(paymentInfo.eventDetails)
        }

        setPaymentData(paymentInfo)

        // Generate unique transaction ID
        const uniqueTransactionId = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        setTransactionId(uniqueTransactionId)

        // Set up share URL
        const baseUrl = window.location.origin
        setShareUrl(`${baseUrl}/event/${paymentInfo.eventCreatorId}/${paymentInfo.eventId}`)

        // Fetch user data first (we need this for wallet balance)
        const userDataResult = await fetchUserData()

        // If we don't have event details from location state, fetch them
        if (!paymentInfo.eventDetails) {
          Logger.info("Fetching event details...")
          await fetchEventDetails(paymentInfo.eventCreatorId, paymentInfo.eventId)
        }

        setLoading(false)

        // Start payment process after a short delay to ensure UI is ready
        setTimeout(() => {
          if (isMounted.current && !transactionProcessed) {
            processPayment(paymentInfo)
          }
        }, 500)
      } catch (error) {
        Logger.error("Error during initialization", error)
        setErrorDetails(error instanceof Error ? error.message : "Failed to initialize payment")
        setLoading(false)
        setPaymentResult({
          success: false,
          message: error instanceof Error ? error.message : "Failed to initialize payment",
        })
      }
    }

    initializeComponent()
  }, [location, navigate])

  // Fetch user data including wallet balance
  const fetchUserData = async () => {
    Logger.info("Fetching user data")

    try {
      const user = auth.currentUser
      if (!user) {
        Logger.error("User not authenticated")
        throw new Error("User not authenticated")
      }

      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        Logger.error("User document not found")
        throw new Error("User data not found")
      }

      const userDataFromDb = userDoc.data() as UserData
      setUserData(userDataFromDb)
      setWalletBalance(userDataFromDb.wallet || 0)

      Logger.success("IWSS fetched user data successfully")
      return userDataFromDb
    } catch (error) {
      Logger.error("Error fetching user data", error)
      throw error
    }
  }

  // Fetch complete event details
  const fetchEventDetails = async (creatorId: string, eventId: string) => {
    Logger.info("Fetching event details", { creatorId, eventId })

    try {
      // Validate parameters
      if (!creatorId || !eventId) {
        Logger.error("Invalid event parameters", { creatorId, eventId })
        throw new Error("Invalid event parameters")
      }

      const eventDocRef = doc(db, "events", creatorId, "userEvents", eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (!eventDoc.exists()) {
        Logger.error("Event document not found")
        throw new Error("Event not found")
      }

      const data = eventDoc.data()

      // Get booker details
      const bookerDocRef = doc(db, "users", creatorId)
      const bookerDoc = await getDoc(bookerDocRef)
      let bookerName = "Event Host"
      let bookerEmail = "support@spotix.com.ng"

      if (bookerDoc.exists()) {
        const bookerData = bookerDoc.data()
        bookerName = bookerData.bookerName || bookerData.fullName || "Event Host"
        bookerEmail = bookerData.email || "support@spotix.com.ng"
      }

      const eventDetailsData = {
        eventVenue: data.eventVenue || "",
        eventType: data.eventType || "",
        eventDate: data.eventDate || "",
        eventEndDate: data.eventEndDate || "",
        eventStart: data.eventStart || "",
        eventEnd: data.eventEnd || "",
        stopDate: data.enableStopDate ? data.stopDate : undefined,
        enableStopDate: data.enableStopDate || false,
        bookerName,
        bookerEmail,
      }

      Logger.success("Event details fetched successfully")
      setEventDetails(eventDetailsData)

      return eventDetailsData
    } catch (error) {
      Logger.error("Error fetching event details", error)
      throw error
    }
  }

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  // Fetch event details
  // const fetchEventDetails = async (creatorId: string, eventId: string) => {
  //   try {
  //     const eventDocRef = doc(db, "events", creatorId, "userEvents", eventId)
  //     const eventDoc = await getDoc(eventDocRef)

  //     if (eventDoc.exists()) {
  //       const data = eventDoc.data()

  //       // Get booker details
  //       const bookerDocRef = doc(db, "users", creatorId)
  //       const bookerDoc = await getDoc(bookerDocRef)
  //       let bookerName = "Event Host"
  //       let bookerEmail = "support@spotix.com.ng"

  //       if (bookerDoc.exists()) {
  //         const bookerData = bookerDoc.data()
  //         bookerName = bookerData.bookerName || bookerData.fullName || "Event Host"
  //         bookerEmail = bookerData.email || "support@spotix.com.ng"
  //       }

  //       setEventDetails({
  //         eventVenue: data.eventVenue || "",
  //         eventType: data.eventType || "",
  //         eventDate: data.eventDate || "",
  //         eventEndDate: data.eventEndDate || "",
  //         eventStart: data.eventStart || "",
  //         eventEnd: data.eventEnd || "",
  //         stopDate: data.enableStopDate ? data.stopDate : undefined,
  //         enableStopDate: data.enableStopDate || false,
  //         bookerName,
  //         bookerEmail,
  //       })
  //     }
  //   } catch (error) {
  //     console.error("Error fetching event details:", error)
  //   }
  // }

  // Generate unique ticket ID
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

  // Generate transaction reference
  const generateReference = () => {
    const letters = Math.random().toString(36).substring(2, 8).toUpperCase()
    const numbers = Math.floor(1000 + Math.random() * 9000).toString()
    return `${letters}${numbers}`
  }

  // Update discount usage if applicable
  const updateDiscountUsage = async () => {
    if (!paymentData?.appliedDiscount) return

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

      const q = query(discountsCollectionRef, where("code", "==", paymentData.appliedDiscount.code))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const discountDoc = querySnapshot.docs[0]
        await updateDoc(discountDoc.ref, {
          usedCount: paymentData.appliedDiscount.usedCount + 1,
        })
      }
    } catch (error) {
      console.error("Error updating discount usage:", error)
    }
  }

  // Send confirmation email
  const sendConfirmationEmail = async (ticketId: string, ticketReference: string, userData: any) => {
    if (!paymentData || !eventDetails) return

    try {
      setEmailSending(true)

      const response = await fetch("api/mail/payment-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userData.email,
          name: userData.fullName || userData.username || "Valued Customer",
          ticket_ID: ticketId,
          event_host: eventDetails.bookerName || "Event Host",
          event_name: paymentData.eventName,
          payment_ref: ticketReference,
          ticket_type: paymentData.ticketType,
          booker_email: eventDetails.bookerEmail || "support@spotix.com.ng",
          ticket_price: paymentData.totalAmount.toFixed(2),
          payment_method: "IWSS", // In-Wallet Spotix System
          event_venue: eventDetails.eventVenue || "Not specified",
          event_date: eventDetails.eventDate || "Not specified",
          event_start: eventDetails.eventStart || "Not specified",
          event_end: eventDetails.eventEnd || "Not specified",
          transaction_id: `wallet-${Date.now()}`,
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

  const handleStartPayment = async () => {
    if (!paymentData) return

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

      if (walletBalance < paymentData.totalAmount) {
        setStepStatus("error")
        setPaymentResult({
          success: false,
          message: `Insufficient funds in wallet. Balance: NGN ${formatNumber(walletBalance)}, Required: NGN ${formatNumber(paymentData.totalAmount)}`,
        })
        return
      }

      // Update wallet balance
      const newBalance = walletBalance - paymentData.totalAmount
      await updateDoc(userDocRef, {
        wallet: newBalance,
      })

      // Update discount usage if a discount was applied
      if (paymentData.appliedDiscount) {
        await updateDiscountUsage()
      }

      setStepStatus("success")

      // Send email step
      setCurrentStep("sending-email")
      setStepStatus("loading")
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Generate ticket ID and reference
      const ticketId = generateTicketId()
      const ticketReference = generateReference()

      // Get current date and time
      const now = new Date()
      const purchaseDate = now.toLocaleDateString()
      const purchaseTime = now.toLocaleTimeString()

      // Generate unique transaction ID
      const transactionId = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create wallet-pay entry
      const walletPayCollectionRef = collection(db, "users", user.uid, "wallet-pay")
      await addDoc(walletPayCollectionRef, {
        transactionId: transactionId,
        transactionDate: purchaseDate,
        transactionTime: purchaseTime,
        transactionType: paymentData.eventName,
        amount: paymentData.totalAmount,
        ticketPrice: paymentData.finalPrice,
        transactionFee: paymentData.transactionFee,
        tag: "debit",
        ticketId,
        ticketReference,
        eventId: paymentData.eventId,
        eventCreatorId: paymentData.eventCreatorId,
        eventName: paymentData.eventName,
        ticketType: paymentData.ticketType,
        eventVenue: eventDetails.eventVenue || "Not specified",
        eventDate: eventDetails.eventDate || "",
        eventStart: eventDetails.eventStart || "",
        eventEnd: eventDetails.eventEnd || "",
        eventType: eventDetails.eventType || "",
        bookerName: eventDetails.bookerName || "Event Host",
        bookerEmail: eventDetails.bookerEmail || "support@spotix.com.ng",
        discountApplied: paymentData.appliedDiscount ? true : false,
        discountCode: paymentData.appliedDiscount ? paymentData.appliedDiscount.code : null,
        discountType: paymentData.appliedDiscount ? paymentData.appliedDiscount.type : null,
        discountValue: paymentData.appliedDiscount ? paymentData.appliedDiscount.value : null,
        userEmail: userData.email,
        userFullName: userData.fullName || "",
        status: "completed",
        previousBalance: walletBalance,
        newBalance: newBalance,
      })

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
        ticketPrice: paymentData.finalPrice,
        transactionFee: paymentData.transactionFee,
        totalAmount: paymentData.totalAmount,
        transactionId: transactionId,
        discountApplied: paymentData.appliedDiscount ? true : false,
        discountCode: paymentData.appliedDiscount ? paymentData.appliedDiscount.code : null,
        discountType: paymentData.appliedDiscount ? paymentData.appliedDiscount.type : null,
        discountValue: paymentData.appliedDiscount ? paymentData.appliedDiscount.value : null,
        eventVenue: eventDetails.eventVenue || "Not specified",
        eventType: eventDetails.eventType || "",
        eventDate: eventDetails.eventDate || "",
        eventEndDate: eventDetails.eventEndDate || "",
        eventStart: eventDetails.eventStart || "",
        eventEnd: eventDetails.eventEnd || "",
        bookerName: eventDetails.bookerName || "Event Host",
        bookerEmail: eventDetails.bookerEmail || "support@spotix.com.ng",
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
          totalRevenue: (eventData.totalRevenue || 0) + paymentData.totalAmount,
        })
      }

      // Send confirmation email
      await sendConfirmationEmail(ticketId, ticketReference, userData)

      setStepStatus("success")

      // Finalize
      setCurrentStep("finalizing")
      setStepStatus("loading")
      await new Promise((resolve) => setTimeout(resolve, 1000))
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
        message: error instanceof Error ? error.message : "An error occurred during payment processing",
      })
    }
  }

  // Navigation handlers
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

  // Handle retry for failed transactions
  const handleRetry = () => {
    setPaymentResult(null)
    setPaymentStarted(false)
    setCurrentStep(null)
    setStepStatus(null)
  }

  if (loading || !paymentData) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <Helmet>
        <title>{paymentData.eventName} Wallet Payment - Spotix</title>
        <meta name="description" content="Secure wallet payment for your event tickets on Spotix." />
        <link rel="canonical" href={`${window.location.origin}/wallet`} />
        <meta property="og:title" content="Wallet Payment - Spotix" />
        <meta property="og:description" content="Secure wallet payment for your event tickets on Spotix." />
      </Helmet>
      <UserHeader />
      <div className="payment-page-container">
        {!paymentStarted ? (
          <div className="payment-method-selection">
            <h2>Spotix IWSS Checkout</h2>

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

              {paymentData.appliedDiscount && (
                <>
                  <div className="payment-summary-row original-price">
                    <span>Original Price:</span>
                    <span>NGN {formatNumber(Number(paymentData.ticketPrice))}</span>
                  </div>
                  <div className="payment-summary-row discount">
                    <span>Discount:</span>
                    <span>{paymentData.appliedDiscount.code}</span>
                  </div>
                </>
              )}

              <div className="payment-summary-row">
                <span>Ticket Price:</span>
                <span>NGN {formatNumber(paymentData.finalPrice)}</span>
              </div>

              <div className="payment-summary-row">
                <span>Transaction Fee:</span>
                <span>NGN {formatNumber(paymentData.transactionFee)}</span>
              </div>

              <div className="payment-summary-row total">
                <span>Total Price:</span>
                <span>NGN {formatNumber(paymentData.totalAmount)}</span>
              </div>

              <div className="payment-summary-row">
                <span>Current Wallet Balance:</span>
                <span>NGN {formatNumber(walletBalance)}</span>
              </div>
            </div>

            <div className="payment-actions">
              <button className="cancel-payment-btn" onClick={handleGoHome}>
                Cancel
              </button>
              <button
                className="proceed-payment-btn"
                onClick={handleStartPayment}
                disabled={walletBalance < paymentData.totalAmount}
              >
                {walletBalance < paymentData.totalAmount ? "Insufficient Funds" : "Pay with Wallet"}
              </button>
            </div>

            {walletBalance < paymentData.totalAmount && (
              <div className="insufficient-funds-message">
                <AlertTriangle size={16} className="warning-icon" />
                <p>
                  Insufficient wallet balance. You need NGN {formatNumber(paymentData.totalAmount - walletBalance)} more
                  to complete this transaction.
                </p>
              </div>
            )}
          </div>
        ) : paymentResult ? (
          <div className="payment-result">
            {paymentResult.success ? (
              <div className="payment-success">
                <div className="success-icon">
                  <CheckCircle size={60} className="text-green-500" />
                </div>
                <h2>Payment Successful!</h2>

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
                        {eventDetails?.eventDate
                          ? new Date(eventDetails.eventDate).toLocaleDateString()
                          : "Not specified"}
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
                      <span>NGN {formatNumber(paymentData.transactionFee)}</span>
                    </div>
                    <div className="ticket-detail-row">
                      <span>Amount Paid:</span>
                      <span>NGN {formatNumber(paymentData.totalAmount)}</span>
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

                {errorDetails && (
                  <div className="error-details">
                    <AlertTriangle size={16} className="error-details-icon" />
                    <p>{errorDetails}</p>
                  </div>
                )}

                <div className="failed-actions">
                  <button className="retry-btn" onClick={handleRetry}>
                    Retry Payment
                  </button>
                  <button className="close-dialog-btn" onClick={handleGoHome}>
                    Back to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="payment-processing">
            <h2>Processing Wallet Payment</h2>

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
                <div className="step-label">
                  Charging NGN {paymentData ? formatNumber(paymentData.totalAmount) : "0"} from Wallet
                </div>
              </div>

              <div
                className={`payment-step ${currentStep === "sending-email" ? "active" : ""} ${
                  currentStep === "sending-email" && stepStatus === "success"
                    ? "completed"
                    : currentStep === "sending-email" && stepStatus === "error"
                      ? "error"
                      : ""
                }`}
              >
                <div className="step-status">
                  {currentStep === "sending-email" && stepStatus === "loading" && <Loader2 className="animate-spin" />}
                  {currentStep === "sending-email" && stepStatus === "success" && (
                    <CheckCircle className="text-green-500" />
                  )}
                  {currentStep === "sending-email" && stepStatus === "error" && <XCircle className="text-red-500" />}
                </div>
                <div className="step-label">Sending Confirmation Email</div>
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
          </div>
        )}
      </div>
      <Footer />
      {/* Add CSS for the security badge and other UI elements */}
      <style>{`
        .security-badge-container {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
        }

        .security-badge {
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, rgba(107, 47, 165, 0.1), rgba(107, 47, 165, 0.2));
          border: 1px solid rgba(107, 47, 165, 0.3);
          border-radius: 12px;
          padding: 0.75rem 1.25rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(107, 47, 165, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(107, 47, 165, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(107, 47, 165, 0);
          }
        }

        .security-badge-icon {
          margin-right: 0.75rem;
        }

        .security-shield {
          font-size: 1.5rem;
          color: #6b2fa5;
          animation: rotate 3s infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(5deg);
          }
          75% {
            transform: rotate(-5deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        .security-badge-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .security-badge-text span {
          font-size: 0.75rem;
          color: #666;
        }

        .security-badge-text strong {
          font-size: 1rem;
          color: #6b2fa5;
        }

        .insufficient-funds-message {
          margin-top: 1rem;
          background-color: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .warning-icon {
          color: #ffc107;
          margin-top: 0.2rem;
        }

        .insufficient-funds-message p {
          margin: 0;
          font-size: 0.9rem;
          color: #856404;
        }

        .error-details {
          margin-top: 1rem;
          background-color: rgba(255, 0, 0, 0.05);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .error-details-icon {
          color: #ff6b6b;
          margin-top: 0.2rem;
        }

        .error-details p {
          margin: 0;
          font-size: 0.85rem;
          color: #666;
        }

        .failed-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .retry-btn {
          background-color: #6b2fa5;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .retry-btn:hover {
          background-color: #5a2589;
        }

        .proceed-payment-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}

export default Wallet
