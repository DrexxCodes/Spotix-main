"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { doc, getDoc, collection, addDoc, updateDoc } from "firebase/firestore"
import AgentHeader from "../components/AgentHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import {
  Search,
  AlertCircle,
  CheckCircle,
  Ticket,
  User,
  Mail,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Loader2,
  Tag,
  Users,
  Wallet,
  Key,
  UserCheck,
} from "lucide-react"
import "./agent.css"

interface TicketPrice {
  policy: string
  price: string
}

interface EventData {
  eventName: string
  eventDescription: string
  eventDate: string
  eventEndDate: string
  eventVenue: string
  eventStart: string
  eventEnd: string
  eventType: string
  eventImage: string
  isFree: boolean
  ticketPrices: TicketPrice[]
  bookerName: string
  id: string
  eventId: string
  createdBy: string
  allowAgents?: boolean
}

interface UserData {
  uid?: string
  fullName?: string
  email: string
  isSpotixUser: boolean
  isVerified?: boolean
}

interface AuthKeyData {
  customerName: string
  customerEmail: string
  eventName: string
  ticketType: string
  ticketPrice: string
  agentUsername: string
  agentId: string
  agentUid: string
  validated: boolean
  createdAt: any
  validatedBy?: string
  validatedByUid?: string
  validatedAt?: any
}

// Format currency with commas
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const Agent = () => {
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [bookerId, setBookerId] = useState("")
  const [eventId, setEventId] = useState("")
  const [event, setEvent] = useState<EventData | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedTicketType, setSelectedTicketType] = useState<TicketPrice | null>(null)
  const [userData, setUserData] = useState<UserData>({
    uid: "",
    fullName: "",
    email: "",
    isSpotixUser: false,
    isVerified: false,
  })
  const [agentData, setAgentData] = useState<any>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [ticketData, setTicketData] = useState<any>(null)

  // AuthKey validation states
  const [authKey, setAuthKey] = useState("")
  const [isAuthKeyEnabled, setIsAuthKeyEnabled] = useState(false)
  const [isValidatingAuthKey, setIsValidatingAuthKey] = useState(false)
  const [authKeyValidated, setAuthKeyValidated] = useState(false)
  const [authKeyError, setAuthKeyError] = useState("")
  const [authKeyData, setAuthKeyData] = useState<AuthKeyData | null>(null)

  // User verification states
  const [isVerifyingUser, setIsVerifyingUser] = useState(false)
  const [userVerified, setUserVerified] = useState(false)
  const [userVerificationError, setUserVerificationError] = useState("")

  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          window.location.href = "/login"
          return
        }

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()

          // Check if user is an agent
          if (!userData.isAgent) {
            window.location.href = "/home"
            return
          }

          setAgentData({
            uid: user.uid,
            agentId: userData.agentId || "UNKNOWN",
            name: userData.fullName || userData.username || "Agent",
            email: userData.email || "agent@spotix.com.ng",
            agentWallet: userData.agentWallet || 0,
            agentGain: userData.agentGain || 0,
          })
        } else {
          window.location.href = "/login"
          return
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking agent status:", error)
        setError("Error checking agent status. Please try again.")
        setLoading(false)
      }
    }

    checkAgentStatus()
  }, [])

  // Enable AuthKey input when user UID is entered and verified
  useEffect(() => {
    if (userData.isSpotixUser && userData.uid && userData.uid.trim().length > 0 && userVerified) {
      setIsAuthKeyEnabled(true)
    } else {
      setIsAuthKeyEnabled(false)
      setAuthKey("")
      setAuthKeyValidated(false)
      setAuthKeyData(null)
      setAuthKeyError("")
    }
  }, [userData.isSpotixUser, userData.uid, userVerified])

  const handleSearch = async () => {
    if (!bookerId.trim() || !eventId.trim()) {
      setError("Please enter both Booker ID and Event ID")
      return
    }

    setSearchLoading(true)
    setError("")
    setEvent(null)

    try {
      // Check if the event exists
      const eventDocRef = doc(db, "events", bookerId, "userEvents", eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (!eventDoc.exists()) {
        setError("Event not found. Please check the Booker ID and Event ID.")
        setSearchLoading(false)
        return
      }

      const eventData = eventDoc.data() as EventData

      // Check if agent activity is allowed for this event
      if (!checkAgentAccess(eventData)) {
        setError("Agent activity has been disabled for this event by the event creator.")
        setSearchLoading(false)
        return
      }

      setEvent({
        ...eventData,
        id: eventDoc.id,
      })
    } catch (error) {
      console.error("Error searching for event:", error)
      setError("Error searching for event. Please try again.")
    } finally {
      setSearchLoading(false)
    }
  }

  const checkAgentAccess = (eventData: EventData): boolean => {
    // If allowAgents is explicitly set to false, deny access
    if (eventData.allowAgents === false) {
      return false
    }

    // If allowAgents is explicitly set to true, allow access
    if (eventData.allowAgents === true) {
      return true
    }

    // If allowAgents is not present, deny access by default
    return false
  }

  const handleTicketTypeSelect = (ticketType: TicketPrice) => {
    setSelectedTicketType(ticketType)
  }

  const handleUserTypeChange = (isSpotixUser: boolean) => {
    setUserData({
      uid: "",
      fullName: "",
      email: "",
      isSpotixUser,
      isVerified: false,
    })

    // Reset user verification
    setUserVerified(false)
    setUserVerificationError("")

    // Reset AuthKey validation when user type changes
    setAuthKey("")
    setAuthKeyValidated(false)
    setAuthKeyData(null)
    setAuthKeyError("")
    setIsAuthKeyEnabled(false)
  }

  const handleUserDataChange = (field: string, value: string) => {
    setUserData({
      ...userData,
      [field]: value,
    })

    // Reset user verification when UID changes
    if (field === "uid") {
      setUserVerified(false)
      setUserVerificationError("")

      // Reset AuthKey validation when user data changes
      setAuthKey("")
      setAuthKeyValidated(false)
      setAuthKeyData(null)
      setAuthKeyError("")
    }
  }

  // New function to verify user by UID
  const verifyUser = async () => {
    if (!userData.uid || !userData.isSpotixUser) {
      setUserVerificationError("Please enter a valid Spotix User UID")
      return
    }

    setIsVerifyingUser(true)
    setUserVerificationError("")
    setUserVerified(false)

    try {
      // Verify the UID exists in Firestore
      const userDocRef = doc(db, "users", userData.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        setUserVerificationError("User with this UID does not exist")
        setIsVerifyingUser(false)
        return
      }

      // Update user data with information from Firestore
      const userDocData = userDoc.data()
      setUserData({
        ...userData,
        fullName: userDocData.fullName || userDocData.username || "Spotix User",
        email: userDocData.email || "",
        isVerified: true,
      })

      setUserVerified(true)
      setSuccess("User verified successfully!")
    } catch (error) {
      console.error("Error verifying user:", error)
      setUserVerificationError("Error verifying user. Please try again.")
    } finally {
      setIsVerifyingUser(false)
    }
  }

  const validateAuthKey = async () => {
    if (!authKey.trim() || !userData.uid) {
      setAuthKeyError("Please enter a valid Auth Key")
      return
    }

    setIsValidatingAuthKey(true)
    setAuthKeyError("")
    setAuthKeyData(null)
    setAuthKeyValidated(false)

    try {
      // Check if the AuthKey exists in Firestore
      const authKeyDocRef = doc(db, "AuthKey", authKey.trim())
      const authKeyDoc = await getDoc(authKeyDocRef)

      if (!authKeyDoc.exists()) {
        setAuthKeyError("Invalid Auth Key. Please check and try again.")
        setIsValidatingAuthKey(false)
        return
      }

      const authData = authKeyDoc.data() as AuthKeyData

      // Check if the AuthKey is already validated
      if (!authData.validated) {
        setAuthKeyError("This Auth Key has not been validated by the customer yet.")
        setIsValidatingAuthKey(false)
        return
      }

      // Check if the validator's UID matches the current user's UID
      if (authData.validatedByUid !== userData.uid) {
        setAuthKeyError(
          "This Auth Key was not validated by this user. The user can only use Auth Keys that they have validated.",
        )
        setIsValidatingAuthKey(false)
        return
      }

      // Store the AuthKey data
      setAuthKeyData(authData)
      setAuthKeyValidated(true)
      setSuccess("Auth Key validated successfully!")
    } catch (error) {
      console.error("Error validating Auth Key:", error)
      setAuthKeyError("An error occurred while validating the Auth Key. Please try again.")
    } finally {
      setIsValidatingAuthKey(false)
    }
  }

  const validateUserData = async (): Promise<boolean> => {
    // Reset error
    setError("")

    // Check if a ticket type is selected
    if (!selectedTicketType) {
      setError("Please select a ticket type")
      return false
    }

    // Validate based on user type
    if (userData.isSpotixUser) {
      // Spotix user validation
      if (!userData.uid) {
        setError("Please enter the user's UID")
        return false
      }

      // Check if user is verified
      if (!userVerified) {
        setError("Please verify the user before proceeding")
        return false
      }

      // Check if AuthKey is validated for Spotix users
      if (!authKeyValidated) {
        setError("Please validate the Auth Key before proceeding")
        return false
      }
    } else {
      // Non-Spotix user validation
      if (!userData.fullName) {
        setError("Please enter the user's name")
        return false
      }

      if (!userData.email) {
        setError("Please enter the user's email")
        return false
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userData.email)) {
        setError("Please enter a valid email address")
        return false
      }
    }

    return true
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

  // Add a new function to send agent sale notification
  const sendAgentSaleNotification = async (
    agentData: any,
    userData: any,
    eventName: string,
    ticketType: string,
    ticketPrice: string,
  ) => {
    try {
      await fetch("https://spotix-backend.onrender.com/api/notify/agent-sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_email: agentData.email || "agent@spotix.com.ng", // Use agent's email from agentData
          agent_name: agentData.name,
          customer_email: userData.email,
          customer_name: userData.fullName,
          price: `₦${formatCurrency(Number.parseFloat(ticketPrice))}`,
          ticket_type: ticketType,
          event_name: eventName,
          year: new Date().getFullYear().toString(),
        }),
      })

      console.log("Agent sale notification sent successfully")
    } catch (error) {
      console.error("Error sending agent sale notification:", error)
      // Don't throw error to prevent disrupting the main flow
    }
  }

  const handlePurchaseTicket = async () => {
    // Validate user data
    const isValid = await validateUserData()
    if (!isValid || !event || !selectedTicketType || !agentData) return

    // For Spotix users, ensure user is verified and AuthKey is validated
    if (userData.isSpotixUser) {
      if (!userVerified) {
        setError("Please verify the user before proceeding")
        return
      }

      if (!authKeyValidated) {
        setError("Please validate the Auth Key before proceeding")
        return
      }
    }

    setProcessingPayment(true)
    setError("")
    setSuccess("")

    try {
      // Check if agent has enough balance in wallet
      const ticketPrice = Number.parseFloat(selectedTicketType.price)
      if (agentData.agentWallet < ticketPrice) {
        setError("Insufficient funds in your agent wallet. Please top up your wallet.")
        setProcessingPayment(false)
        return
      }

      // Generate ticket ID and reference
      const ticketId = generateTicketId()
      const ticketReference = generateReference()

      // Get current date and time
      const now = new Date()
      const purchaseDate = now.toLocaleDateString()
      const purchaseTime = now.toLocaleTimeString()

      // Prepare ticket data
      const ticketData = {
        uid: userData.isSpotixUser ? userData.uid : null,
        fullName: userData.fullName || "",
        email: userData.email,
        ticketType: selectedTicketType.policy,
        ticketId,
        ticketReference,
        purchaseDate,
        purchaseTime,
        verified: false,
        paymentMethod: "Agent Wallet",
        ticketPrice: ticketPrice,
        // Event details
        eventId: event.id,
        eventName: event.eventName,
        eventVenue: event.eventVenue,
        eventType: event.eventType,
        eventDate: event.eventDate,
        eventEndDate: event.eventEndDate,
        eventStart: event.eventStart,
        eventEnd: event.eventEnd,
        // Agent details
        agentId: agentData.agentId,
        agentName: agentData.name,
        agentUid: agentData.uid,
        soldByAgent: true,
        // Add AuthKey reference for Spotix users
        authKey: userData.isSpotixUser ? authKey : null,
      }

      // Add to attendees collection for the event
      const attendeesCollectionRef = collection(db, "events", bookerId, "userEvents", eventId, "attendees")
      await addDoc(attendeesCollectionRef, ticketData)

      // If it's a Spotix user, add to their ticket history
      if (userData.isSpotixUser && userData.uid) {
        const ticketHistoryRef = collection(db, "TicketHistory", userData.uid, "tickets")
        await addDoc(ticketHistoryRef, {
          ...ticketData,
          eventCreatorId: bookerId,
        })
      }

      // Update event stats (increment tickets sold and revenue)
      const eventDocRef = doc(db, "events", bookerId, "userEvents", eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (eventDoc.exists()) {
        const eventData = eventDoc.data()
        await updateDoc(eventDocRef, {
          ticketsSold: (eventData.ticketsSold || 0) + 1,
          totalRevenue: (eventData.totalRevenue || 0) + ticketPrice,
        })
      }

      // Deduct ticket price from agent's wallet
      const agentDocRef = doc(db, "users", agentData.uid)
      const newWalletBalance = agentData.agentWallet - ticketPrice

      await updateDoc(agentDocRef, {
        agentWallet: newWalletBalance,
        agentGain: (agentData.agentGain || 0) + 100, // Add 100 NGN commission
      })

      // Record the sale in the agent's transactions/sales collection
      const salesCollectionRef = collection(db, "users", agentData.uid, "transactions", "sales", "records")
      await addDoc(salesCollectionRef, {
        eventName: event.eventName,
        ticketType: selectedTicketType.policy,
        ticketPrice: ticketPrice,
        customerName: userData.fullName,
        customerEmail: userData.email,
        customerUid: userData.isSpotixUser ? userData.uid : null,
        ticketId,
        ticketReference,
        purchaseDate: now,
        bookerId,
        eventId,
        authKey: userData.isSpotixUser ? authKey : null,
        walletDeduction: ticketPrice,
        commission: 100, // 100 NGN commission
        newWalletBalance: newWalletBalance,
      })

      // Send confirmation emails
      await sendTicketEmail(ticketData)

      // Send agent sale notification
      await sendAgentSaleNotification(
        agentData,
        userData,
        event.eventName,
        selectedTicketType.policy,
        selectedTicketType.price,
      )

      // Save ticket data for display
      setTicketData(ticketData)
      setPaymentSuccess(true)
      setSuccess("Ticket purchased successfully!")

      // Update local agent data with new wallet balance and earnings
      setAgentData({
        ...agentData,
        agentWallet: newWalletBalance,
        agentGain: (agentData.agentGain || 0) + 100,
      })
    } catch (error) {
      console.error("Error purchasing ticket:", error)
      setError("Error purchasing ticket. Please try again.")
    } finally {
      setProcessingPayment(false)
    }
  }

  const sendTicketEmail = async (ticketData: any) => {
    try {
      // Get booker email
      const bookerDocRef = doc(db, "users", bookerId)
      const bookerDoc = await getDoc(bookerDocRef)
      const bookerEmail = bookerDoc.exists() ? bookerDoc.data().email : "support@spotix.com.ng"

      const response = await fetch("https://spotix-backend.onrender.com/api/notify/agent-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: ticketData.email,
          name: ticketData.fullName,
          agent_ID: agentData.agentId,
          agent_name: agentData.name,
          payment_method: "Agent Wallet",
          ticket_price: `₦${formatCurrency(Number.parseFloat(selectedTicketType!.price))}`,
          booker_email: bookerEmail,
          ticket_type: ticketData.ticketType,
          payment_ref: ticketData.ticketReference,
          event_name: event!.eventName,
          event_host: event!.bookerName,
          ticket_ID: ticketData.ticketId,
          year: new Date().getFullYear().toString(),
        }),
      })

      if (!response.ok) {
        console.error("Failed to send ticket email:", await response.text())
      } else {
        console.log("Agent ticket email sent successfully")
      }
    } catch (error) {
      console.error("Error sending ticket email:", error)
    }
  }

  const resetForm = () => {
    setSelectedTicketType(null)
    setUserData({
      uid: "",
      fullName: "",
      email: "",
      isSpotixUser: false,
      isVerified: false,
    })
    setPaymentSuccess(false)
    setTicketData(null)
    setAuthKey("")
    setAuthKeyValidated(false)
    setAuthKeyData(null)
    setAuthKeyError("")
    setIsAuthKeyEnabled(false)
    setUserVerified(false)
    setUserVerificationError("")
  }

  const handleNewTicket = () => {
    resetForm()
  }

  const handleNewSearch = () => {
    setBookerId("")
    setEventId("")
    setEvent(null)
    resetForm()
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
          <Helmet>
  <title>Spotix Agent</title>
  <meta name="description" content="Find, book, and attend the best events on your campus. Discover concerts, night parties, workshops, religious events, and more on Spotix." />
  {/* Open Graph for social media */}
  <meta property="og:title" content="Spotix | Spotix Agent" />
  <meta property="og:description" content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix." />
  <meta property="og:image" content="/meta.png" />
  <meta property="og:url" content="https://spotix.com.ng" />
  <meta property="og:type" content="website" />

  {/* Twitter Card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Spotix | Discover and Book Campus Events" />
  <meta name="twitter:description" content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix." />
  <meta name="twitter:image" content="/meta.png" />
</Helmet>
      <AgentHeader />
      <div className="agent-container">
        <div className="agent-header">
          <h1>Agent Ticket Sales</h1>
          {agentData && (
            <div className="agent-info">
              <div className="agent-id">
                <Tag size={16} />
                <span>Agent ID: {agentData.agentId}</span>
              </div>
              <div className="agent-wallet">
                <Wallet size={16} />
                <span>Wallet: ₦{formatCurrency(agentData.agentWallet)}</span>
              </div>
              <div className="agent-wallet">
                <DollarSign size={16} />
                <span>Earnings: ₦{formatCurrency(agentData.agentGain || 0)}</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="success-message">
            <CheckCircle size={18} />
            <p>{success}</p>
          </div>
        )}

        {!event ? (
          <div className="search-section">
            <h2>Find Event</h2>
            <p>Enter the Booker ID and Event ID to search for an event</p>

            <div className="search-form">
              <div className="form-group">
                <label htmlFor="booker-id">Booker ID</label>
                <input
                  type="text"
                  id="booker-id"
                  value={bookerId}
                  onChange={(e) => setBookerId(e.target.value)}
                  placeholder="Enter event owner's ID"
                  disabled={searchLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="event-id">Event ID</label>
                <input
                  type="text"
                  id="event-id"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="Enter event ID"
                  disabled={searchLoading}
                />
              </div>

              <button
                className="search-button"
                onClick={handleSearch}
                disabled={searchLoading || !bookerId || !eventId}
              >
                {searchLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Search Event
                  </>
                )}
              </button>
            </div>
          </div>
        ) : paymentSuccess && ticketData ? (
          <div className="ticket-success-section">
            <div className="success-header">
              <CheckCircle size={48} className="success-icon" />
              <h2>Ticket Purchased Successfully!</h2>
            </div>

            <div className="ticket-preview">
              <div className="ticket-header">
                <img src="/logo.svg" alt="Spotix Logo" className="ticket-logo" />
                <h3>SPOTIX</h3>
              </div>
              <div className="ticket-details">
                <div className="ticket-detail-row">
                  <span>Name:</span>
                  <span>{ticketData.fullName}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Email:</span>
                  <span>{ticketData.email}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Event:</span>
                  <span>{event.eventName}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Venue:</span>
                  <span>{event.eventVenue}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Date:</span>
                  <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Ticket Type:</span>
                  <span>{ticketData.ticketType}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Ticket ID:</span>
                  <span className="ticket-id">{ticketData.ticketId}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Reference:</span>
                  <span>{ticketData.ticketReference}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Amount Paid:</span>
                  <span>₦{formatCurrency(Number.parseFloat(selectedTicketType!.price))}</span>
                </div>
                <div className="ticket-detail-row">
                  <span>Sold By:</span>
                  <span>
                    Agent {agentData.name} ({agentData.agentId})
                  </span>
                </div>
                {ticketData.authKey && (
                  <div className="ticket-detail-row">
                    <span>Auth Key:</span>
                    <span>{ticketData.authKey}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="email-sent-message">
              <Mail size={16} />A confirmation email has been sent to {ticketData.email}
            </p>

            <div className="success-actions">
              <button className="new-ticket-btn" onClick={handleNewTicket}>
                Sell Another Ticket
              </button>
              <button className="new-search-btn" onClick={handleNewSearch}>
                Search New Event
              </button>
            </div>
          </div>
        ) : (
          <div className="event-section">
            <div className="event-header">
              <div className="event-image-container">
                {event.eventImage ? (
                  <img src={event.eventImage || "/placeholder.svg"} alt={event.eventName} className="event-image" />
                ) : (
                  <div className="event-image-placeholder">
                    <Calendar size={48} />
                  </div>
                )}
              </div>
              <div className="event-info">
                <h2>{event.eventName}</h2>
                <div className="event-meta">
                  <div className="event-meta-item">
                    <Calendar size={16} />
                    <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className="event-meta-item">
                    <Clock size={16} />
                    <span>
                      {event.eventStart} - {event.eventEnd}
                    </span>
                  </div>
                  <div className="event-meta-item">
                    <MapPin size={16} />
                    <span>{event.eventVenue}</span>
                  </div>
                  <div className="event-meta-item">
                    <Users size={16} />
                    <span>By {event.bookerName}</span>
                  </div>
                </div>
              </div>
            </div>

            {event.isFree ? (
              <div className="free-event-notice">
                <AlertCircle size={24} />
                <p>This is a free event. No tickets need to be purchased.</p>
                <button className="new-search-btn" onClick={handleNewSearch}>
                  Search Another Event
                </button>
              </div>
            ) : checkAgentAccess(event) === false ? (
              <div className="agent-disabled-message">
                <AlertCircle size={48} className="agent-disabled-icon" />
                <h3>Agent Sales Disabled</h3>
                <p>This event creator has disabled agent ticket sales for this event.</p>
                <button className="new-search-btn" onClick={handleNewSearch}>
                  Search Another Event
                </button>
              </div>
            ) : (
              <div className="ticket-purchase-section">
                <div className="ticket-types-section">
                  <h3>Select Ticket Type</h3>
                  <div className="ticket-types-list">
                    {event.ticketPrices.map((ticket, index) => (
                      <div
                        key={index}
                        className={`ticket-type-card ${selectedTicketType?.policy === ticket.policy ? "selected" : ""}`}
                        onClick={() => handleTicketTypeSelect(ticket)}
                      >
                        <div className="ticket-type-info">
                          <h4>{ticket.policy}</h4>
                          <p className="ticket-price">
                            <DollarSign size={16} />₦{formatCurrency(Number.parseFloat(ticket.price))}
                          </p>
                        </div>
                        {selectedTicketType?.policy === ticket.policy && (
                          <div className="selected-indicator">
                            <CheckCircle size={20} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTicketType && (
                  <div className="user-details-section">
                    <h3>Customer Information</h3>

                    <div className="user-type-toggle">
                      <button
                        className={`user-type-btn ${!userData.isSpotixUser ? "active" : ""}`}
                        onClick={() => handleUserTypeChange(false)}
                      >
                        New Customer
                      </button>
                      <button
                        className={`user-type-btn ${userData.isSpotixUser ? "active" : ""}`}
                        onClick={() => handleUserTypeChange(true)}
                      >
                        Spotix User
                      </button>
                    </div>

                    {userData.isSpotixUser ? (
                      <>
                        <div className="form-group">
                          <label htmlFor="user-uid">
                            <User size={16} />
                            Spotix User UID
                          </label>
                          <div className="uid-input-container">
                            <input
                              type="text"
                              id="user-uid"
                              value={userData.uid}
                              onChange={(e) => handleUserDataChange("uid", e.target.value)}
                              placeholder="Enter user's Spotix UID"
                              disabled={userVerified}
                              className={userVerified ? "verified" : ""}
                            />
                            <button
                              className="verify-user-button"
                              onClick={verifyUser}
                              disabled={isVerifyingUser || !userData.uid || userVerified}
                            >
                              {isVerifyingUser ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Verifying...
                                </>
                              ) : userVerified ? (
                                <>
                                  <UserCheck size={16} />
                                  Verified
                                </>
                              ) : (
                                <>
                                  <User size={16} />
                                  Verify User
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {userVerificationError && (
                          <div className="user-verification-error">
                            <AlertCircle size={16} />
                            <p>{userVerificationError}</p>
                          </div>
                        )}

                        {userVerified && (
                          <div className="user-details-card">
                            <h4>User Details</h4>
                            <div className="user-detail-row">
                              <span>Name:</span>
                              <span>{userData.fullName}</span>
                            </div>
                            <div className="user-detail-row">
                              <span>Email:</span>
                              <span>{userData.email}</span>
                            </div>
                          </div>
                        )}

                        {/* Auth Key Validation Section */}
                        <div className="auth-key-section">
                          <div className="form-group">
                            <label htmlFor="auth-key">
                              <Key size={16} />
                              Auth Key
                            </label>
                            <div className="auth-key-input-container">
                              <input
                                type="text"
                                id="auth-key"
                                value={authKey}
                                onChange={(e) => setAuthKey(e.target.value)}
                                placeholder="Enter Auth Key (e.g., SP-Auth-XXXXXXXXXXXX)"
                                disabled={!isAuthKeyEnabled}
                                className={`auth-key-input ${!isAuthKeyEnabled ? "disabled" : ""}`}
                              />
                              <button
                                className="validate-key-button"
                                onClick={validateAuthKey}
                                disabled={isValidatingAuthKey || !authKey.trim() || !isAuthKeyEnabled}
                              >
                                {isValidatingAuthKey ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Validating...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={16} />
                                    Validate
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {!isAuthKeyEnabled && userData.isSpotixUser && (
                            <div className="auth-key-info">
                              <AlertCircle size={16} />
                              <p>Verify the user first to enable Auth Key validation</p>
                            </div>
                          )}

                          {authKeyError && (
                            <div className="auth-key-error">
                              <AlertCircle size={16} />
                              <p>{authKeyError}</p>
                            </div>
                          )}

                          {authKeyValidated && authKeyData && (
                            <div className="auth-key-success">
                              <CheckCircle size={16} />
                              <p>Auth Key validated successfully!</p>
                            </div>
                          )}

                          {authKeyValidated && authKeyData && (
                            <div className="auth-key-details">
                              <h4>Auth Key Details</h4>
                              <div className="auth-key-detail-row">
                                <span>Customer:</span>
                                <span>{authKeyData.customerName}</span>
                              </div>
                              <div className="auth-key-detail-row">
                                <span>Event:</span>
                                <span>{authKeyData.eventName}</span>
                              </div>
                              <div className="auth-key-detail-row">
                                <span>Ticket Type:</span>
                                <span>{authKeyData.ticketType}</span>
                              </div>
                              <div className="auth-key-detail-row">
                                <span>Price:</span>
                                <span>₦{authKeyData.ticketPrice}</span>
                              </div>
                              <div className="auth-key-detail-row">
                                <span>Validated By:</span>
                                <span>{authKeyData.validatedBy}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="form-group">
                          <label htmlFor="user-name">
                            <User size={16} />
                            Full Name
                          </label>
                          <input
                            type="text"
                            id="user-name"
                            value={userData.fullName}
                            onChange={(e) => handleUserDataChange("fullName", e.target.value)}
                            placeholder="Enter customer's full name"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="user-email">
                            <Mail size={16} />
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="user-email"
                            value={userData.email}
                            onChange={(e) => handleUserDataChange("email", e.target.value)}
                            placeholder="Enter customer's email address"
                          />
                        </div>
                      </>
                    )}

                    <div className="purchase-summary">
                      <h4>Purchase Summary</h4>
                      <div className="summary-row">
                        <span>Ticket Type:</span>
                        <span>{selectedTicketType.policy}</span>
                      </div>
                      <div className="summary-row">
                        <span>Price:</span>
                        <span>₦{formatCurrency(Number.parseFloat(selectedTicketType.price))}</span>
                      </div>
                      <div className="summary-row">
                        <span>Payment Method:</span>
                        <span>Agent Wallet</span>
                      </div>
                      <div className="summary-row">
                        <span>Your Commission:</span>
                        <span className="commission">₦100.00</span>
                      </div>
                      <div className="summary-row">
                        <span>Your Wallet Balance:</span>
                        <span
                          className={
                            agentData.agentWallet < Number.parseFloat(selectedTicketType.price)
                              ? "insufficient-funds"
                              : ""
                          }
                        >
                          ₦{formatCurrency(agentData.agentWallet)}
                        </span>
                      </div>
                      {agentData.agentWallet < Number.parseFloat(selectedTicketType.price) && (
                        <div className="wallet-warning">
                          <AlertCircle size={16} />
                          <p>Insufficient funds in your wallet</p>
                        </div>
                      )}
                    </div>

                    <button
                      className="purchase-button"
                      onClick={handlePurchaseTicket}
                      disabled={
                        processingPayment ||
                        (userData.isSpotixUser && (!userVerified || !authKeyValidated)) ||
                        agentData.agentWallet < Number.parseFloat(selectedTicketType.price)
                      }
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Ticket size={16} />
                          Purchase Ticket
                        </>
                      )}
                    </button>

                    {userData.isSpotixUser && !userVerified && (
                      <div className="purchase-button-info">
                        <AlertCircle size={16} />
                        <p>User verification is required before proceeding</p>
                      </div>
                    )}

                    {userData.isSpotixUser && userVerified && !authKeyValidated && (
                      <div className="purchase-button-info">
                        <AlertCircle size={16} />
                        <p>Auth Key validation is required before proceeding</p>
                      </div>
                    )}

                    {agentData.agentWallet < Number.parseFloat(selectedTicketType.price) && (
                      <div className="purchase-button-info">
                        <AlertCircle size={16} />
                        <p>Please top up your agent wallet to complete this transaction</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default Agent
