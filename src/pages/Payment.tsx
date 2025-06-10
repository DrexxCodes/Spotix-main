"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import { CheckCircle, Loader2, AlertCircle, Tag } from "lucide-react"
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
  bookerName?: string
  bookerEmail?: string
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
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  // Payment process states
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [stepStatus, setStepStatus] = useState<"loading" | "success" | "error" | null>(null)
  const [walletBalance, setWalletBalance] = useState<number>(0)

  // Check if event is free
  const isFreeEvent = finalPrice === 0

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

  // Auto-select wallet for free events and prevent disabled method selection
  useEffect(() => {
    if (isFreeEvent) {
      if (paymentMethod === "paystack" || paymentMethod === "agent") {
        setPaymentMethod("wallet")
      }
    }
  }, [isFreeEvent, paymentMethod])

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  // Fetch event details
  const fetchEventDetails = async (creatorId: string, eventId: string) => {
    try {
      const eventDocRef = doc(db, "events", creatorId, "userEvents", eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (eventDoc.exists()) {
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

        setEventDetails({
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

          // Add transaction fee to the final price
          const totalWithFee = finalPrice + 150

          // Prepare payment metadata with discount information and event details
          const paymentMetadata = {
            userId: user.uid,
            eventId: paymentData.eventId,
            eventCreatorId: paymentData.eventCreatorId,
            ticketType: paymentData.ticketType,
            eventName: paymentData.eventName,
            originalPrice: paymentData.ticketPrice,
            ticketPrice: finalPrice,
            transactionFee: 150,
            totalAmount: totalWithFee,
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
            bookerName: eventDetails.bookerName,
            bookerEmail: eventDetails.bookerEmail,
            userFullName: userData.fullName || userData.username || "Valued Customer",
            userEmail: userData.email,
          }

          // Save payment data for the callback
          localStorage.setItem(
            "paystack_payment_data",
            JSON.stringify({
              ...paymentData,
              ticketPrice: finalPrice,
              transactionFee: 150,
              totalAmount: totalWithFee,
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
              bookerName: eventDetails.bookerName || null,
              bookerEmail: eventDetails.bookerEmail || null,
              userFullName: userData.fullName || userData.username || "Valued Customer",
              userEmail: userData.email,
              // Only include stopDate if it exists
              ...(eventDetails.stopDate ? { stopDate: eventDetails.stopDate } : {}),
            }),
          )

          // Calculate amount in kobo (smallest currency unit)
          const amountInKobo = Math.round(totalWithFee * 100)

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

  const handleAgentPay = () => {
    if (!paymentData) return

    // Add transaction fee to the final price
    const totalWithFee = finalPrice + 150

    // Open agent-pay.tsx in a new tab with the necessary data
    const url = `/agent-pay?eventId=${paymentData.eventId}&eventCreatorId=${paymentData.eventCreatorId}&eventName=${encodeURIComponent(paymentData.eventName)}&ticketType=${encodeURIComponent(paymentData.ticketType)}&ticketPrice=${totalWithFee}&transactionFee=150`
    window.open(url, "_blank")
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
    } else if (paymentMethod === "agent") {
      handleAgentPay()
      return
    } else if (paymentMethod === "wallet") {
      // Redirect to Wallet.tsx with necessary data
      navigate("/wallet", {
        state: {
          ...paymentData,
          finalPrice: finalPrice,
          transactionFee: 150,
          totalAmount: finalPrice + 150,
          appliedDiscount: appliedDiscount,
          eventDetails: eventDetails,
        },
      })
      return
    }
  }

  const handleGoHome = () => {
    navigate("/home")
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
      <Helmet>
        <title>{paymentData.eventName} Payment - Spotix</title>
        <meta name="description" content="Secure payment for your event tickets on Spotix." />
        <link rel="canonical" href={`${window.location.origin}/payment`} />
        <meta property="og:title" content="Payment - Spotix" />
        <meta property="og:description" content="Secure payment for your event tickets on Spotix." />
      </Helmet>
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
                      ? `${appliedDiscount.value}% off (NGN ${formatNumber(discountAmount)})`
                      : `NGN ${formatNumber(appliedDiscount.value)} off`}
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
                <div className="payment-method-balance">NGN {formatNumber(walletBalance)}</div>
              </div>
              <div
                className={`payment-method ${paymentMethod === "paystack" ? "selected" : ""} ${isFreeEvent ? "disabled" : ""}`}
                onClick={() => !isFreeEvent && setPaymentMethod("paystack")}
              >
                <div className="payment-method-icon">💳</div>
                <div className="payment-method-name">
                  Paystack
                  {isFreeEvent && <span className="disabled-badge">Not Available</span>}
                </div>
                <div className="payment-method-description">
                  {isFreeEvent ? "Not available for free events" : "Card Payment"}
                </div>
              </div>
              <div
                className={`payment-method ${paymentMethod === "agent" ? "selected" : ""} ${isFreeEvent ? "disabled" : ""}`}
                onClick={() => !isFreeEvent && setPaymentMethod("agent")}
              >
                <div className="payment-method-icon">🙍🏻‍♂️</div>
                <div className="payment-method-name">
                  Agent Pay
                  {isFreeEvent && <span className="disabled-badge">Not Available</span>}
                </div>
                <div className="payment-method-description">
                  {isFreeEvent ? "Not available for free events" : "Pay via Agent"}
                </div>
                {!isFreeEvent && <div className="new-tag">NEW</div>}
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
                    <span>NGN {formatNumber(Number(paymentData.ticketPrice))}</span>
                  </div>
                  <div className="payment-summary-row discount">
                    <span>Discount:</span>
                    <span>
                      {appliedDiscount.type === "percentage"
                        ? `${appliedDiscount.value}% (NGN ${formatNumber(discountAmount)})`
                        : `NGN ${formatNumber(appliedDiscount.value)}`}
                    </span>
                  </div>
                </>
              )}

              <div className="payment-summary-row">
                <span>Ticket Price:</span>
                <span>NGN {formatNumber(finalPrice)}</span>
              </div>

              <div className={`payment-summary-row ${isFreeEvent ? "strikethrough" : ""}`}>
                <span>Transaction Fee:</span>
                <span>NGN 150</span>
                {isFreeEvent && <span className="free-event-note">(Waived for free events)</span>}
              </div>

              <div className="payment-summary-row total">
                <span>Total Price:</span>
                <span>NGN {formatNumber(isFreeEvent ? 0 : finalPrice + 150)}</span>
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
        ) : (
          <div className="payment-processing">
            <h2>Redirecting to payment...</h2>
            <div className="processing-message">Please wait while we prepare your payment...</div>
            <Loader2 className="animate-spin mx-auto mt-4" size={40} />
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
