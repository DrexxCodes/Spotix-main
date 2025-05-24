"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db, auth } from "../services/firebase"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import { Helmet } from "react-helmet"
import { ArrowLeft, User, Ticket, Info, X } from "lucide-react"
import ShareBtn from "../components/shareBtn"
import LoginButton from "../components/loginBtn"
import "boxicons/css/boxicons.min.css"
import "../responsive.css"
import "./event.css"

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
        <div className="h-10 w-1/3 bg-gray-200 rounded-md"></div>
        <div className="h-10 w-1/3 bg-gray-200 rounded-md"></div>
        <div className="h-10 w-1/3 bg-gray-200 rounded-md"></div>
      </div>

      <div className="space-y-4 p-4">
        <div className="h-8 w-3/4 bg-gray-200 rounded-md"></div>

        <div className="flex justify-between items-center">
          <div className="h-6 w-24 bg-gray-200 rounded-md"></div>
          <div className="h-6 w-24 bg-gray-200 rounded-md"></div>
        </div>

        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-6 w-1/3 bg-gray-200 rounded-md"></div>
              <div className="h-6 w-1/2 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>

        <div className="h-32 w-full bg-gray-200 rounded-md"></div>
      </div>
    </div>
  </div>
)

const Event = () => {
  const { uid, id } = useParams<{ uid: string; id: string }>()
  const [eventData, setEventData] = useState<EventType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"details" | "tickets" | "booker">("details")
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

  // Format number with commas
  const formatNumber = useCallback((num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }, [])

  // Format currency with commas
  const formatCurrency = useCallback(
    (amount: number): string => {
      return `₦${formatNumber(Number.parseFloat(amount.toFixed(2)))}`
    },
    [formatNumber],
  )

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
        // Store current path for redirect after login
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
      // Store current path for redirect after login
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
                <>
                  <span className="wallet-label">Balance:</span>
                  <span className="wallet-amount">{formatCurrency(walletBalance)}</span>
                </>
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

          <img src={eventData.eventImage || "/placeholder.svg"} alt={eventData.eventName} className="event-image" />

          <div className="event-tabs">
            <button
              className={`tab-button ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              <Info size={16} />
              Event Details
            </button>
            <button
              className={`tab-button ${activeTab === "tickets" ? "active" : ""}`}
              onClick={() => setActiveTab("tickets")}
            >
              <Ticket size={16} />
              Buy Ticket
            </button>
            <button
              className={`tab-button ${activeTab === "booker" ? "active" : ""}`}
              onClick={() => setActiveTab("booker")}
            >
              <User size={16} />
              Booker Details
            </button>
          </div>

          <div className="tab-content-wrapper">
            <div className="tab-content">
              {activeTab === "details" && (
                <div className="event-details-tab">
                  <h1 className="event-title">{eventData.eventName}</h1>

                  <div className="event-actions-container">
                    <div className="event-share-container">
                      <ShareBtn url={eventUrl} title={`Join me at ${eventData.eventName}`} />
                    </div>

                    <div className="event-like-container">
                      <button
                        className={`event-like-button ${isLiked ? "liked" : ""}`}
                        onClick={handleToggleLike}
                        disabled={isLiking}
                      >
                        {isLiked ? (
                          <i className="bx bxs-heart like-icon"></i>
                        ) : (
                          <i className="bx bx-heart like-icon"></i>
                        )}
                        <span className="like-count">{formatNumber(likeCount)}</span>
                      </button>
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Event Type:</span>
                    <span className="detail-value">{eventData.eventType}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Start Date:</span>
                    <span className="detail-value">
                      {new Date(eventData.eventDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Start Time:</span>
                    <span className="detail-value">{eventData.eventStart || "Not specified"}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">End Date:</span>
                    <span className="detail-value">
                      {eventData.eventEndDate
                        ? new Date(eventData.eventEndDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Not specified"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">End Time:</span>
                    <span className="detail-value">{eventData.eventEnd || "Not specified"}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Venue:</span>
                    <span className="detail-value">{eventData.eventVenue}</span>
                  </div>

                  {eventData.enableMaxSize && eventData.maxSize && (
                    <div className="detail-row">
                      <span className="detail-label">Maximum Attendees:</span>
                      <span className="detail-value">
                        {formatNumber(eventData.ticketsSold || 0)} / {formatNumber(Number.parseInt(eventData.maxSize))}
                        {isSoldOut && <span className="sold-out-badge">SOLD OUT</span>}
                      </span>
                    </div>
                  )}

                  {eventData.enableColorCode && eventData.colorCode && (
                    <div className="detail-row">
                      <span className="detail-label">Event Color:</span>
                      <span className="detail-value">
                        <span className="color-preview" style={{ backgroundColor: eventData.colorCode }}></span>
                        {eventData.colorCode}
                      </span>
                    </div>
                  )}

                  {eventData.eventDescription && (
                    <div className="event-description">
                      <h3>Description</h3>
                      <p>{eventData.eventDescription}</p>
                      <div className="detail-row">
                        <span className="detail-label">Agent Activity:</span>
                        <span className="detail-value">
                          {eventData.allowAgents ? (
                            <span className="agent-status enabled">
                              Enabled - Agents can sell tickets for this event
                            </span>
                          ) : (
                            <span className="agent-status disabled">Disabled - Only organizer can sell tickets</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tickets" && (
                <div className="tickets-tab">
                  <h2>Ticket Information</h2>

                  {isEventToday && !isEventPassed && (
                    <div className="event-today-message">Event is happening today! Grab your tickets now</div>
                  )}

                  {isSoldOut && (
                    <div className="sold-out-message">This event is sold out! No more tickets are available.</div>
                  )}

                  {isSaleEnded && <div className="sale-ended-message">Ticket sales have ended for this event.</div>}

                  {isEventPassed && <div className="event-passed-message">This event has already taken place.</div>}

                  {eventData.enableStopDate && eventData.stopDate && !isSaleEnded && (
                    <div className="ticket-sale-info">
                      <p>Ticket sales end on: {new Date(eventData.stopDate).toLocaleString()}</p>
                    </div>
                  )}

                  {eventData.isFree ? (
                    <div className="free-event-section">
                      <p className="free-tag">This is a free event</p>
                      {isEventPassed ? (
                        <button className="passed-btn" onClick={() => setShowPassedDialog(true)}>
                          Passed
                        </button>
                      ) : (
                        <button
                          className="get-ticket-btn"
                          onClick={() => handleBuyTicket("Free Admission", 0)}
                          disabled={isSoldOut || isSaleEnded}
                        >
                          {isEventToday ? "Get Tickets Today" : "Get Free Ticket"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="ticket-prices">
                      <h3>Available Tickets:</h3>
                      {Array.isArray(eventData.ticketPrices) && eventData.ticketPrices.length > 0 ? (
                        <ul>
                          {eventData.ticketPrices.map((ticket, index) => (
                            <li key={index}>
                              <div className="ticket-info">
                                <span className="policy">{ticket.policy}</span>
                                <span className="price">{formatCurrency(Number.parseFloat(String(ticket.price)))}</span>
                              </div>
                              {isEventPassed ? (
                                <button className="passed-btn" onClick={() => setShowPassedDialog(true)}>
                                  Passed
                                </button>
                              ) : (
                                <button
                                  className="buy-ticket-btn"
                                  onClick={() => handleBuyTicket(ticket.policy, ticket.price)}
                                  disabled={isSoldOut || isSaleEnded}
                                >
                                  {isEventToday ? "Get Tickets Today" : "Buy"}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No ticket pricing information available for this event.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "booker" && (
                <div className="booker-tab">
                  <h2>Event Organizer</h2>

                  {bookerDetails ? (
                    <div className="booker-details">
                      <div className="detail-row">
                        <span className="detail-label">Organizer:</span>
                        <span className="detail-value">
                          {bookerDetails.username}
                          {bookerDetails.isVerified && (
                            <span className="verified-badge" title="Verified Organizer">
                              ✓
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{bookerDetails.email}</span>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{bookerDetails.phone}</span>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Verification Status:</span>
                        <span className="detail-value">
                          {bookerDetails.isVerified ? (
                            <span className="verification-status verified">Verified</span>
                          ) : (
                            <span className="verification-status unverified">Unverified</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p>Loading organizer details...</p>
                  )}
                </div>
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
    </>
  )
}

export default Event
