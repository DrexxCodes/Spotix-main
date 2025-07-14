"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db, auth } from "../services/firebase"
import UserHeader from "../components/UserHeader"
import Search from "../components/search"
import Footer from "../components/footer"
import { Helmet } from "react-helmet"
import { ArrowLeft, User, Ticket, Info, X, Wallet, MapPin, MessageSquare } from "lucide-react"
import LoginButton from "../components/loginBtn"
import EventDetailsTab from "../components/event-details-tab"
import LocationTab from "../components/location-tab"
import BuyTicketTab from "../components/buy-ticket-tab"
import BookerDetailsTab from "../components/booker-details-tab"
import ReviewsTab from "../components/reviews-tab"
import "boxicons/css/boxicons.min.css"
import "../responsive.css"
import "./event.css"
import { formatNumber } from "../utils/formatters"

interface EventType {
  id: string
  eventName: string
  eventImage: string
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  eventType: string
  isFree: boolean
  ticketPrices: { policy: string; price: number }[]
  bookerName: string
  bookerEmail?: string
  bookerPhone?: string
  isVerified?: boolean
  eventDescription?: string
  eventVenue: string
  colorCode?: string
  enableColorCode?: boolean
  enableMaxSize?: boolean
  maxSize?: string
  enableStopDate?: boolean
  stopDate?: string
  ticketsSold?: number
  createdBy: string
  likes?: number
  likedBy?: string[]
  allowAgents?: boolean
}

// Lazy Image Component
const LazyImage: React.FC<{
  src: string
  alt: string
  className?: string
}> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={imgRef} className={`lazy-image-container ${className || ""}`}>
      {!isLoaded && !hasError && (
        <div className="image-placeholder">
          <div className="image-skeleton"></div>
        </div>
      )}
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true)
          setIsLoaded(true)
        }}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
      />
      {hasError && (
        <div className="image-error">
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  )
}

// Loading skeleton component
const EventSkeleton = () => (
  <div className="event-container-wrapper">
    <div className="event-container animate-pulse">
      <div className="event-header">
        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
        <div className="h-8 w-32 bg-gray-200 rounded-md"></div>
      </div>
      <div className="h-64 w-full bg-gray-200 rounded-md mb-4"></div>
      <div className="flex space-x-2 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-1/5 bg-gray-200 rounded-md"></div>
        ))}
      </div>
      <div className="space-y-4 p-4">
        <div className="h-8 w-3/4 bg-gray-200 rounded-md"></div>
        <div className="h-32 w-full bg-gray-200 rounded-md"></div>
      </div>
    </div>
  </div>
)

const Event = () => {
  const { uid, id } = useParams<{ uid: string; id: string }>()
  const [eventData, setEventData] = useState<EventType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"details" | "location" | "tickets" | "booker" | "reviews">("details")
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isSoldOut, setIsSoldOut] = useState(false)
  const [isSaleEnded, setIsSaleEnded] = useState(false)
  const [isEventPassed, setIsEventPassed] = useState(false)
  const [isEventToday, setIsEventToday] = useState(false)
  const [bookerDetails, setBookerDetails] = useState<{
    username: string
    email: string
    phone: string
    isVerified: boolean
  } | null>(null)
  const [eventUrl, setEventUrl] = useState<string>("")
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [showPassedDialog, setShowPassedDialog] = useState(false)
  const [username, setUsername] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  // Use sessionStorage for caching
  const cacheKey = `event_${id}_${uid}`
  const cacheDuration = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Check if event has ended
  const hasEventEnded = useCallback(() => {
    if (!eventData?.eventEndDate) return false

    const now = new Date()
    const endDate = new Date(eventData.eventEndDate)

    // If there's an end time, add it to the end date
    if (eventData.eventEnd) {
      const [hours, minutes] = eventData.eventEnd.split(":").map(Number)
      endDate.setHours(hours || 0, minutes || 0)
    }

    return now > endDate
  }, [eventData])

  useEffect(() => {
    // Check authentication status
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user)

      if (user) {
        // Fetch wallet balance and username if authenticated
        const fetchUserData = async () => {
          try {
            const userDocRef = doc(db, "users", user.uid)
            const userDoc = await getDoc(userDocRef)

            if (userDoc.exists()) {
              const userData = userDoc.data()
              setWalletBalance(userData.wallet || 0)
              setUsername(userData.username || userData.fullName || "User")
            }
          } catch (error) {
            console.error("Error fetching user data:", error)
          }
        }
        fetchUserData()
      }
    })

    // Set the event URL for sharing
    setEventUrl(window.location.href)

    return () => unsubscribe()
  }, [])

  const checkEventStatus = useCallback((data: EventType) => {
    const now = new Date()
    const eventDate = new Date(data.eventDate)

    // Check if event is happening today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const eventDateOnly = new Date(eventDate)
    eventDateOnly.setHours(0, 0, 0, 0)
    const isToday = today.getTime() === eventDateOnly.getTime()
    setIsEventToday(isToday)

    // Check if event is sold out
    if (data.enableMaxSize && data.maxSize && data.ticketsSold) {
      if (Number.parseInt(data.maxSize) <= data.ticketsSold) {
        setIsSoldOut(true)
      }
    }

    // Check if sales have ended
    if (data.enableStopDate && data.stopDate) {
      const stopDate = new Date(data.stopDate)
      if (now > stopDate) {
        setIsSaleEnded(true)
      }
    } else {
      // If no stop date specified, allow sales until 11:59pm of event date
      const salesEndTime = new Date(eventDate)
      salesEndTime.setHours(23, 59, 59, 999)
      if (now > salesEndTime) {
        setIsSaleEnded(true)
      }
    }

    // Check if event date has passed (but not if it's today)
    if (!isToday && now > eventDate) {
      setIsEventPassed(true)
    }
  }, [])

  const checkLikeStatus = useCallback((data: EventType) => {
    const user = auth.currentUser
    if (!user) return

    // Check if user has liked this event
    const userLiked = data.likedBy?.includes(user.uid) || false
    setIsLiked(userLiked)

    // Set like count
    setLikeCount(data.likes || 0)
  }, [])

  const fetchBookerDetails = useCallback(async (creatorId: string, bookerName: string) => {
    try {
      const bookerDocRef = doc(db, "users", creatorId)
      const bookerDoc = await getDoc(bookerDocRef)

      if (bookerDoc.exists()) {
        const bookerData = bookerDoc.data()
        setBookerDetails({
          username: bookerName || bookerData.username || "Unknown",
          email: bookerData.email || "Not provided",
          phone: bookerData.phoneNumber || "Not provided",
          isVerified: bookerData.isVerified || false,
        })
      }
    } catch (error) {
      console.error("Error fetching booker details:", error)
    }
  }, [])

  const fetchFreshData = useCallback(async () => {
    try {
      if (!uid || !id) {
        setEventData(null)
        setLoading(false)
        return
      }

      const docRef = doc(db, "events", uid, "userEvents", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as EventType
        const eventWithId = { ...data, id: docSnap.id }

        // Cache the data with timestamp
        const cacheData = {
          data: eventWithId,
          timestamp: Date.now(),
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))

        setEventData(eventWithId)

        // Check event status
        checkEventStatus(eventWithId)

        // Check if current user has liked this event
        checkLikeStatus(eventWithId)

        // Fetch booker details
        await fetchBookerDetails(eventWithId.createdBy, eventWithId.bookerName)
      } else {
        setEventData(null)
      }
    } catch (error) {
      console.error("Error fetching event:", error)
    } finally {
      setLoading(false)
    }
  }, [uid, id, cacheKey, checkEventStatus, checkLikeStatus, fetchBookerDetails])

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id || !uid) {
        setLoading(false)
        return
      }

      // Try to get from cache first
      const cachedDataString = sessionStorage.getItem(cacheKey)

      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString)
          const now = Date.now()

          // Check if cache is still valid
          if (cachedData.timestamp && now - cachedData.timestamp < cacheDuration) {
            setEventData(cachedData.data)
            checkEventStatus(cachedData.data)
            checkLikeStatus(cachedData.data)
            await fetchBookerDetails(cachedData.data.createdBy, cachedData.data.bookerName)
            setLoading(false)

            // Refresh in background after using cache
            fetchFreshData()
            return
          }
        } catch (error) {
          console.error("Error parsing cached data:", error)
        }
      }

      // No valid cache, fetch fresh data
      fetchFreshData()
    }

    fetchEvent()
  }, [id, uid, cacheKey, cacheDuration, checkEventStatus, checkLikeStatus, fetchBookerDetails, fetchFreshData])

  const handleToggleLike = async () => {
    try {
      const user = auth.currentUser
      if (!user || !eventData) {
        // Redirect to login if user is not authenticated
        sessionStorage.setItem("redirectAfterLogin", location.pathname)
        navigate("/login")
        return
      }

      setIsLiking(true)

      const eventDocRef = doc(db, "events", uid as string, "userEvents", id as string)

      if (isLiked) {
        // Unlike event
        await updateDoc(eventDocRef, {
          likes: (likeCount || 0) - 1,
          likedBy: arrayRemove(user.uid),
        })
        setIsLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
      } else {
        // Like event
        await updateDoc(eventDocRef, {
          likes: (likeCount || 0) + 1,
          likedBy: arrayUnion(user.uid),
        })
        setIsLiked(true)
        setLikeCount((prev) => prev + 1)
      }

      // Update cache with new like status
      const cachedDataString = sessionStorage.getItem(cacheKey)
      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString)
          const updatedEventData = {
            ...cachedData.data,
            likes: isLiked ? (cachedData.data.likes || 0) - 1 : (cachedData.data.likes || 0) + 1,
            likedBy: isLiked
              ? (cachedData.data.likedBy || []).filter((id: string) => id !== user.uid)
              : [...(cachedData.data.likedBy || []), user.uid],
          }

          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: updatedEventData,
              timestamp: cachedData.timestamp,
            }),
          )
        } catch (error) {
          console.error("Error updating cached data:", error)
        }
      }
    } catch (error) {
      console.error("Error toggling like status:", error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleBuyTicket = (ticketType: string, ticketPrice: number | string) => {
    if (!eventData) return

    if (isEventPassed) {
      setShowPassedDialog(true)
      return
    }

    if (isSoldOut) {
      alert("Sorry, this event is sold out!")
      return
    }

    if (isSaleEnded) {
      alert("Sorry, ticket sales have ended for this event!")
      return
    }

    // Check if user is authenticated
    if (!auth.currentUser) {
      sessionStorage.setItem("redirectAfterLogin", location.pathname)
      navigate("/login")
      return
    }

    // Ensure price is a number
    const parsedPrice = typeof ticketPrice === "string" ? Number.parseFloat(ticketPrice) : ticketPrice

    // Navigate to payment page with ticket details
    navigate("/payment", {
      state: {
        eventId: id,
        eventName: eventData.eventName,
        ticketType,
        ticketPrice: parsedPrice,
        eventCreatorId: uid,
      },
    })
  }

  const handleBackClick = () => {
    navigate("/home")
  }

  const handleClosePassedDialog = () => {
    setShowPassedDialog(false)
  }

  const handleShowPassedDialog = () => {
    setShowPassedDialog(true)
  }

  if (loading) {
    return (
      <>
        <UserHeader />
        <EventSkeleton />
        <Footer />
      </>
    )
  }

  if (!eventData) {
    return (
      <>
        <UserHeader />
        <div className="error-message">Event not found.</div>
        <Footer />
      </>
    )
  }

  // Apply event color if set
  const eventStyle = eventData.enableColorCode && eventData.colorCode ? { borderColor: eventData.colorCode } : {}

  return (
    <>
      <Search />
      <Helmet>
        <title>{eventData.eventName} - Event Details</title>
        <meta name="description" content={`Details about the event: ${eventData.eventName}`} />
        <link rel="canonical" href={eventUrl} />
        <meta property="og:title" content={eventData.eventName} />
        <meta property="og:description" content={`Details about the event: ${eventData.eventName}`} />
        <meta property="og:image" content={eventData.eventImage || "/placeholder.svg"} />
        <meta property="og:url" content={eventUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Spotix" />
      </Helmet>
      <UserHeader />
      <div className="event-container-wrapper">
        <div className="event-container" style={eventStyle}>
          <div className="event-header">
            <button className="back-button" onClick={handleBackClick}>
              <ArrowLeft size={24} />
            </button>
            <div className="wallet-display">
              {isAuthenticated ? (
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-800 px-3 py-1.5 rounded-lg shadow-md">
                  <Wallet size={16} className="text-white" />
                  <span className="wallet-label event-white font-medium">Balance:</span>
                  <span className="wallet-amount event-white font-bold">₦{formatNumber(walletBalance)}</span>
                </div>
              ) : (
                <LoginButton />
              )}
            </div>
          </div>

          {/* Scrolling Marquee */}
          <div className="event-marquee-container">
            <div className="event-marquee">
              <span>
                Grab your tickets for this event today🎉! Events block color will change in response to the color code
                of event set by booker. Got any report about this event⛔? Use Spotix Telegram Bot to make reports
              </span>
            </div>
          </div>

          {/* Lazy loaded event image */}
          <div className="event-image-container">
            <LazyImage
              src={eventData.eventImage || "/placeholder.svg"}
              alt={eventData.eventName}
              className="event-image"
            />
          </div>

          <div className="event-tabs">
            <button
              className={`tab-button ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              <Info size={16} />
              Details
            </button>
            <button
              className={`tab-button ${activeTab === "location" ? "active" : ""}`}
              onClick={() => setActiveTab("location")}
            >
              <MapPin size={16} />
              Location
            </button>
            <button
              className={`tab-button ${activeTab === "tickets" ? "active" : ""}`}
              onClick={() => setActiveTab("tickets")}
            >
              <Ticket size={16} />
              Tickets
            </button>
            <button
              className={`tab-button ${activeTab === "booker" ? "active" : ""}`}
              onClick={() => setActiveTab("booker")}
            >
              <User size={16} />
              Organizer
            </button>
            <button
              className={`tab-button ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              <MessageSquare size={16} />
              Reviews
            </button>
          </div>

          <div className="tab-content-wrapper">
            <div className="tab-content">
              {activeTab === "details" && (
                <EventDetailsTab
                  eventData={eventData}
                  eventUrl={eventUrl}
                  isLiked={isLiked}
                  likeCount={likeCount}
                  isLiking={isLiking}
                  isSoldOut={isSoldOut}
                  onToggleLike={handleToggleLike}
                />
              )}

              {activeTab === "location" && (
                <LocationTab eventVenue={eventData.eventVenue} eventName={eventData.eventName} />
              )}

              {activeTab === "tickets" && (
                <BuyTicketTab
                  eventData={eventData}
                  isEventToday={isEventToday}
                  isEventPassed={isEventPassed}
                  isSoldOut={isSoldOut}
                  isSaleEnded={isSaleEnded}
                  onBuyTicket={handleBuyTicket}
                  onShowPassedDialog={handleShowPassedDialog}
                />
              )}

              {activeTab === "booker" && (
                <BookerDetailsTab
                  bookerDetails={bookerDetails}
                  bookerName={eventData.bookerName}
                  creatorId={eventData.createdBy}
                />
              )}

              {activeTab === "reviews" && (
                <ReviewsTab
                  eventId={id || ""}
                  eventName={eventData.eventName}
                  eventEndDate={eventData.eventEndDate}
                  eventEnd={eventData.eventEnd}
                  hasEventEnded={hasEventEnded()}
                  isAuthenticated={isAuthenticated}
                />
              )}
            </div>
          </div>

          {/* Passed Event Dialog */}
          {showPassedDialog && (
            <div className="passed-event-dialog-overlay">
              <div className="passed-event-dialog">
                <button className="close-dialog-btn" onClick={handleClosePassedDialog}>
                  <X size={20} />
                </button>
                <h3>Event Has Passed</h3>
                <p>
                  Dear {isAuthenticated ? username : "Guest"}, this event has already occurred; you can no longer
                  purchase tickets. Please check out other events on our platform.
                </p>
                <button className="browse-events-btn" onClick={() => navigate("/home")}>
                  Browse Events
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />

      {/* Additional styles */}
      <style>{`
        .location-tab {
          padding: 1rem 0;
        }

        .location-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .location-icon {
          color: #6b2fa5;
        }

        .venue-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .venue-info h3 {
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .venue-address {
          font-size: 1.1rem;
          color: #4b5563;
          margin-bottom: 1rem;
        }

        .maps-button {
          background: #6b2fa5;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .maps-button:hover {
          background: #5a2589;
        }

        .location-note {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 1rem;
        }

        .suggested-events-section {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .suggested-events-section h3 {
          margin-bottom: 1rem;
          color: #1f2937;
        }

        .suggested-events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .suggested-event-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .suggested-event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .event-image-container {
          width: 100%;
          height: 120px;
          overflow: hidden;
        }

        .event-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .event-info {
          padding: 1rem;
        }

        .event-name {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .event-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .suggestions-skeleton {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .suggestion-skeleton-card {
          background: #f3f4f6;
          border-radius: 8px;
          overflow: hidden;
        }

        .skeleton-image {
          width: 100%;
          height: 120px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        .skeleton-content {
          padding: 1rem;
        }

        .skeleton-title {
          height: 1rem;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          margin-bottom: 0.5rem;
          border-radius: 4px;
        }

        .skeleton-text {
          height: 0.75rem;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          margin-bottom: 0.25rem;
          border-radius: 4px;
        }

        .no-suggestions {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        @keyframes loading {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @media (max-width: 768px) {
          .event-tabs {
            overflow-x: auto;
            white-space: nowrap;
            padding-bottom: 0.5rem;
          }

          .tab-button {
            flex-shrink: 0;
            min-width: auto;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }

          .suggested-events-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}

export default Event
