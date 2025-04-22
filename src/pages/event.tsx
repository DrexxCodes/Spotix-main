"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db, auth } from "../services/firebase"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { ArrowLeft, User, Ticket, Info, X } from "lucide-react"
import ShareBtn from "../components/shareBtn"
import "boxicons/css/boxicons.min.css"
import "../responsive.css"

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
}

const Event = () => {
  const { uid, id } = useParams<{ uid: string; id: string }>()
  const [eventData, setEventData] = useState<EventType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"details" | "tickets" | "booker">("details")
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isSoldOut, setIsSoldOut] = useState(false)
  const [isSaleEnded, setIsSaleEnded] = useState(false)
  const [isEventPassed, setIsEventPassed] = useState(false)
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

  const navigate = useNavigate()

  // Use sessionStorage for caching
  const cacheKey = `event_${id}_${uid}`

  useEffect(() => {
    // Set the event URL for sharing
    setEventUrl(window.location.href)

    const fetchWalletBalance = async () => {
      try {
        const user = auth.currentUser
        if (!user) return

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setWalletBalance(userData.wallet || 0)
          setUsername(userData.username || userData.fullName || "User")
        }
      } catch (error) {
        // Handle error silently
      }
    }

    fetchWalletBalance()
  }, [])

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id || !uid) {
        setLoading(false)
        return
      }

      // Try to get from cache first
      const cachedData = sessionStorage.getItem(cacheKey)
      if (cachedData) {
        const parsedData = JSON.parse(cachedData)
        setEventData(parsedData)
        checkEventStatus(parsedData)
        await fetchBookerDetails(parsedData.createdBy, parsedData.bookerName)

        // Check if current user has liked this event
        checkLikeStatus(parsedData)

        setLoading(false)

        // Refresh in background
        fetchFreshData()
        return
      }

      // No cache, fetch fresh data
      fetchFreshData()
    }

    const fetchFreshData = async () => {
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
          setEventData(data)

          // Cache the data
          sessionStorage.setItem(cacheKey, JSON.stringify(data))

          // Check event status
          checkEventStatus(data)

          // Check if current user has liked this event
          checkLikeStatus(data)

          // Fetch booker details
          await fetchBookerDetails(data.createdBy, data.bookerName)
        } else {
          setEventData(null)
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false)
      }
    }

    const checkLikeStatus = (data: EventType) => {
      const user = auth.currentUser
      if (!user) return

      // Check if user has liked this event
      const userLiked = data.likedBy?.includes(user.uid) || false
      setIsLiked(userLiked)

      // Set like count
      setLikeCount(data.likes || 0)
    }

    const checkEventStatus = (data: EventType) => {
      // Check if event is sold out
      if (data.enableMaxSize && data.maxSize && data.ticketsSold) {
        if (Number.parseInt(data.maxSize) <= data.ticketsSold) {
          setIsSoldOut(true)
        }
      }

      // Check if sales have ended
      if (data.enableStopDate && data.stopDate) {
        const stopDate = new Date(data.stopDate)
        const now = new Date()
        if (now > stopDate) {
          setIsSaleEnded(true)
        }
      }

      // Check if event date has passed
      const eventDate = new Date(data.eventDate)
      const now = new Date()
      if (now > eventDate) {
        setIsEventPassed(true)
      }
    }

    const fetchBookerDetails = async (creatorId: string, bookerName: string) => {
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
        // Handle error silently
      }
    }

    fetchEvent()
  }, [id, uid, cacheKey])

  const handleToggleLike = async () => {
    try {
      const user = auth.currentUser
      if (!user || !eventData) {
        // Redirect to login if user is not authenticated
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
    return <Preloader loading={loading} />
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
      <UserHeader />
      <div className="event-container-wrapper">
        <div className="event-container" style={eventStyle}>
          <div className="event-header">
            <button className="back-button" onClick={handleBackClick}>
              <ArrowLeft size={24} />
            </button>
            <div className="wallet-display">
              <span className="wallet-label">Balance:</span>
              <span className="wallet-amount">₦{walletBalance.toFixed(2)}</span>
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
              Ticket Policy
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
                        <span className="like-count">{likeCount}</span>
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
                        {eventData.ticketsSold || 0} / {eventData.maxSize}
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
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tickets" && (
                <div className="tickets-tab">
                  <h2>Ticket Information</h2>

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
                          Get Free Ticket
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
                                <span className="price">₦{Number.parseFloat(String(ticket.price)).toFixed(2)}</span>
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
                                  Buy
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
                  Dear {username}, this event has already occurred; you can no longer purchase tickets. Please check out
                  other events on our platform.
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
