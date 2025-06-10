"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db, realtimeDb } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { ref, set, get } from "firebase/database"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import {
  Search,
  Ticket,
  Calendar,
  Clock,
  Star,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Edit3,
} from "lucide-react"
import { getWithExpiry, setWithExpiry } from "../utils/cacheUtils"
import ConfirmDialog from "../components/confirm-dialog"
import SuccessToast from "../components/success-toast"
import "./review.css"

interface TicketHistoryItem {
  id: string
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  ticketId: string
  ticketReference: string
  purchaseDate: string
  purchaseTime: string
  verified: boolean
  paymentMethod: string
  eventDate?: string
  eventEndDate?: string
  eventStart?: string
  eventEnd?: string
  eventVenue?: string
}

interface EventRating {
  rating: number
  comment?: string
  timestamp: number
  eventName: string
  userDisplayName: string
}

interface SuccessMessage {
  id: string
  message: string
  type: "first-time" | "updated"
}

const EventReviews = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<TicketHistoryItem[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [userRatings, setUserRatings] = useState<Record<string, EventRating>>({})
  const [submittingRatings, setSubmittingRatings] = useState<Record<string, boolean>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [successMessages, setSuccessMessages] = useState<SuccessMessage[]>([])
  const [pendingRating, setPendingRating] = useState<{
    eventId: string
    eventName: string
    rating: number
    comment: string
  } | null>(null)

  // Cache key for ticket history
  const CACHE_KEY = "user_ticket_history_reviews"
  const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

  useEffect(() => {
    const fetchTicketHistory = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        // Try to get from cache first
        const cachedData = getWithExpiry(CACHE_KEY)
        if (cachedData) {
          setTickets(cachedData)
          setFilteredTickets(cachedData)
          setLoading(false)

          // Still fetch in background to update cache
          fetchFromFirestore(user.uid)
          return
        }

        // No cache, fetch from Firestore
        await fetchFromFirestore(user.uid)
      } catch (error) {
        console.error("Error fetching ticket history:", error)
        setLoading(false)
      }
    }

    const fetchFromFirestore = async (uid: string) => {
      try {
        const ticketsCollectionRef = collection(db, "TicketHistory", uid, "tickets")
        const ticketsQuery = query(ticketsCollectionRef, orderBy("purchaseDate", "desc"))
        const ticketsSnapshot = await getDocs(ticketsQuery)

        const ticketsList: TicketHistoryItem[] = []
        ticketsSnapshot.forEach((doc) => {
          const data = doc.data()

          // Handle date and time formatting
          let purchaseDate = "N/A"
          let purchaseTime = "N/A"

          if (data.purchaseDate) {
            if (typeof data.purchaseDate === "string") {
              purchaseDate = data.purchaseDate
              purchaseTime = data.purchaseTime || "N/A"
            } else if (data.purchaseDate.toDate) {
              // Handle Firestore timestamp
              const date = data.purchaseDate.toDate()
              purchaseDate = date.toLocaleDateString()
              purchaseTime = date.toLocaleTimeString()
            }
          }

          ticketsList.push({
            id: doc.id,
            eventId: data.eventId || "",
            eventName: data.eventName || "Unknown Event",
            ticketType: data.ticketType || "Standard",
            ticketPrice: data.ticketPrice || 0,
            ticketId: data.ticketId || "",
            ticketReference: data.ticketReference || "",
            purchaseDate: purchaseDate,
            purchaseTime: purchaseTime,
            verified: data.verified || false,
            paymentMethod: data.paymentMethod || "Wallet",
            eventDate: data.eventDate || "",
            eventEndDate: data.eventEndDate || data.eventDate || "",
            eventStart: data.eventStart || "",
            eventEnd: data.eventEnd || "",
            eventVenue: data.eventVenue || "",
          })
        })

        // Update state
        setTickets(ticketsList)
        setFilteredTickets(ticketsList)

        // Cache the data
        setWithExpiry(CACHE_KEY, ticketsList, CACHE_TTL)

        setLoading(false)
      } catch (error) {
        console.error("Error in fetchFromFirestore:", error)
        throw error
      }
    }

    fetchTicketHistory()
  }, [navigate])

  // Fetch user's existing ratings
  useEffect(() => {
    const fetchUserRatings = async () => {
      const user = auth.currentUser
      if (!user || tickets.length === 0) return

      try {
        const ratingsPromises = tickets.map(async (ticket) => {
          if (!ticket.eventId) return null

          const ratingRef = ref(realtimeDb, `eventRatings/${ticket.eventId}/${user.uid}`)
          const snapshot = await get(ratingRef)

          if (snapshot.exists()) {
            return {
              eventId: ticket.eventId,
              rating: snapshot.val(),
            }
          }
          return null
        })

        const ratingsResults = await Promise.all(ratingsPromises)
        const ratingsMap: Record<string, EventRating> = {}

        ratingsResults.forEach((result) => {
          if (result) {
            ratingsMap[result.eventId] = result.rating
          }
        })

        setUserRatings(ratingsMap)
      } catch (error) {
        console.error("Error fetching user ratings:", error)
      }
    }

    fetchUserRatings()
  }, [tickets])

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTickets(tickets)
    } else {
      const filtered = tickets.filter(
        (ticket) =>
          ticket.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.ticketReference.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredTickets(filtered)
    }
  }, [searchQuery, tickets])

  const showSuccessMessage = (eventName: string, isUpdate: boolean) => {
    const message: SuccessMessage = {
      id: Date.now().toString(),
      message: isUpdate
        ? `Your review for "${eventName}" has been updated successfully!`
        : `Thank you for reviewing "${eventName}"! Your feedback helps others discover great events.`,
      type: isUpdate ? "updated" : "first-time",
    }

    setSuccessMessages((prev) => [...prev, message])

    // Remove message after 5 seconds
    setTimeout(() => {
      setSuccessMessages((prev) => prev.filter((m) => m.id !== message.id))
    }, 5000)
  }

  const handleRatingSubmit = async (eventId: string, eventName: string, rating: number, comment = "") => {
    const user = auth.currentUser
    if (!user || !eventId) return

    const isUpdate = !!userRatings[eventId]

    // Check if user already has a rating for this event
    if (isUpdate) {
      setPendingRating({ eventId, eventName, rating, comment })
      setShowConfirmDialog(true)
      return
    }

    // If no existing rating, submit directly
    await submitRating(eventId, eventName, rating, comment, isUpdate)
  }

  const submitRating = async (eventId: string, eventName: string, rating: number, comment = "", isUpdate = false) => {
    const user = auth.currentUser
    if (!user || !eventId) return

    setSubmittingRatings((prev) => ({ ...prev, [eventId]: true }))

    try {
      const ratingRef = ref(realtimeDb, `eventRatings/${eventId}/${user.uid}`)

      const ratingData: EventRating = {
        rating,
        comment: comment.trim(),
        timestamp: Date.now(),
        eventName,
        userDisplayName: user.displayName || "Anonymous",
      }

      await set(ratingRef, ratingData)

      // Update local state
      setUserRatings((prev) => ({
        ...prev,
        [eventId]: ratingData,
      }))

      // Show success message
      showSuccessMessage(eventName, isUpdate)

      console.log("Rating submitted successfully")
    } catch (error) {
      console.error("Error submitting rating:", error)
      alert("Failed to submit rating. Please try again.")
    } finally {
      setSubmittingRatings((prev) => ({ ...prev, [eventId]: false }))
    }
  }

  const handleConfirmUpdate = async () => {
    if (pendingRating) {
      const { eventId, eventName, rating, comment } = pendingRating
      await submitRating(eventId, eventName, rating, comment, true)
      setShowConfirmDialog(false)
      setPendingRating(null)
    }
  }

  const handleCancelUpdate = () => {
    setShowConfirmDialog(false)
    setPendingRating(null)
  }

  const removeSuccessMessage = (id: string) => {
    setSuccessMessages((prev) => prev.filter((m) => m.id !== id))
  }

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  if (loading) {
    return <Preloader loading={loading} />
  }

  return (
    <div className="event-reviews-container">
      <Helmet>
        <title>Event Reviews | Spotix</title>
        <meta name="description" content="Rate and review events you've attended on Spotix" />
        <meta property="og:title" content="Event Reviews | Spotix" />
        <meta property="og:description" content="Rate and review events you've attended on Spotix" />
        <meta property="og:image" content="/meta.png" />
        <meta property="og:url" content="https://spotix.com.ng/event-reviews" />
        <meta property="og:type" content="website" />
      </Helmet>

      <UserHeader />

      {/* Success Messages */}
      <div className="success-messages-container">
        {successMessages.map((message) => (
          <SuccessToast
            key={message.id}
            message={message.message}
            type={message.type}
            onClose={() => removeSuccessMessage(message.id)}
          />
        ))}
      </div>

      {/* Header section */}
      <div className="reviews-header">
        <div className="reviews-header-content">
          <div className="reviews-title-section">
            <div className="reviews-title-icon">
              <TrendingUp className="icon" />
            </div>
            <h1 className="reviews-title">Rate Your Events</h1>
          </div>
          <p className="reviews-subtitle">Share your experience and help others discover great events</p>

          {/* Search Section */}
          <div className="search-section">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search events to review..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="reviews-content">
        {filteredTickets.length > 0 ? (
          <div className="reviews-grid">
            {filteredTickets.map((ticket) => (
              <EventReviewCard
                key={ticket.id}
                ticket={ticket}
                userRating={userRatings[ticket.eventId]}
                isSubmitting={submittingRatings[ticket.eventId] || false}
                onRatingSubmit={handleRatingSubmit}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Ticket className="icon" />
            </div>
            <h3 className="empty-state-title">No events to review</h3>
            {searchQuery ? (
              <p className="empty-state-message">No events match your search. Try a different term.</p>
            ) : (
              <p className="empty-state-message">
                You haven't attended any events yet. Purchase tickets to get started!
              </p>
            )}
            <button onClick={() => navigate("/home")} className="primary-button">
              Browse Events
            </button>
          </div>
        )}
      </div>

      <Footer />

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <ConfirmDialog
          title="Update Review"
          message="Your existing review will be replaced. Do you want to continue?"
          onConfirm={handleConfirmUpdate}
          onCancel={handleCancelUpdate}
        />
      )}
    </div>
  )
}

// Event Review Card Component
interface EventReviewCardProps {
  ticket: TicketHistoryItem
  userRating?: EventRating
  isSubmitting: boolean
  onRatingSubmit: (eventId: string, eventName: string, rating: number, comment: string) => void
}

const EventReviewCard = ({ ticket, userRating, isSubmitting, onRatingSubmit }: EventReviewCardProps) => {
  const [selectedRating, setSelectedRating] = useState(userRating?.rating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState(userRating?.comment || "")
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Check if event has ended
  const hasEventEnded = () => {
    if (!ticket.eventEndDate) return true // If no end date, assume it's ended

    const now = new Date()
    const endDate = new Date(ticket.eventEndDate)

    // If there's an end time, add it to the end date
    if (ticket.eventEnd) {
      const [hours, minutes] = ticket.eventEnd.split(":").map(Number)
      endDate.setHours(hours || 0, minutes || 0)
    }

    return now > endDate
  }

  const eventEnded = hasEventEnded()

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const handleStarClick = (rating: number) => {
    if (!eventEnded) return

    setSelectedRating(rating)
    setIsAnimating(true)

    if (!showCommentBox) {
      setShowCommentBox(true)
    }

    // Reset animation after a short delay
    setTimeout(() => setIsAnimating(false), 300)
  }

  const renderStars = () => {
    const getStarColor = (starIndex: number, rating: number) => {
      if (starIndex > rating) return "#ddd"

      switch (rating) {
        case 1:
          return "#dc2626" // Deep red
        case 2:
          return "#f87171" // Lighter red
        case 3:
          return "#fbbf24" // Yellow
        case 4:
          return "#16a34a" // Darker green
        case 5:
          return "#22c55e" // Full green
        default:
          return "#ddd"
      }
    }

    return (
      <div className={`rating-stars ${isAnimating ? "animating" : ""}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={24}
            className={`stars ${star <= (hoveredRating || selectedRating) ? "filled" : eventEnded ? "" : "disabled"}`}
            style={{
              color:
                star <= (hoveredRating || selectedRating)
                  ? getStarColor(star, hoveredRating || selectedRating)
                  : "#ddd",
              fill:
                star <= (hoveredRating || selectedRating)
                  ? getStarColor(star, hoveredRating || selectedRating)
                  : "transparent",
            }}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => (eventEnded ? setHoveredRating(star) : null)}
            onMouseLeave={() => (eventEnded ? setHoveredRating(0) : null)}
          />
        ))}
      </div>
    )
  }

  const handleSubmit = () => {
    if (selectedRating > 0 && ticket.eventId && eventEnded) {
      onRatingSubmit(ticket.eventId, ticket.eventName, selectedRating, comment)
    }
  }

  return (
    <div className={`review-card ${userRating ? "has-review" : ""} ${isSubmitting ? "submitting" : ""}`}>
      {/* Event Info Header */}
      <div className="review-card-header">
        <div className="event-icon">
          <Ticket className="icon" />
        </div>
        <div className="event-details">
          <h3 className="event-name">{ticket.eventName}</h3>
          <div className="event-meta">
            <div className="event-date">
              <Calendar className="meta-icon" />
              <span>{ticket.purchaseDate}</span>
            </div>
            <div className="event-time">
              <Clock className="meta-icon" />
              <span>{ticket.purchaseTime}</span>
            </div>
          </div>
          <div className="ticket-details">
            <span className="ticket-type">{ticket.ticketType}</span>
            <span className="ticket-price">₦{formatNumber(ticket.ticketPrice)}</span>
          </div>
        </div>
        {userRating && (
          <div className="review-badge">
            <CheckCircle className="badge-icon" />
            <span className="badge-text">Reviewed</span>
          </div>
        )}
      </div>

      {/* Rating Section */}
      <div className="review-card-body">
        {!eventEnded ? (
          <div className="event-not-ended">
            <AlertTriangle className="warning-icon" />
            <p className="warning-text">The event has to occur before you can rate</p>
            <p className="event-date-info">
              Event ends: {ticket.eventEndDate} {ticket.eventEnd ? `at ${ticket.eventEnd}` : ""}
            </p>
          </div>
        ) : (
          <>
            <div className="rating-section">
              <h4 className="rating-label">
                {userRating ? (
                  <>
                    <Edit3 className="rating-icon" />
                    Your Rating:
                  </>
                ) : (
                  <>
                    <Star className="rating-icon" />
                    Rate this event:
                  </>
                )}
              </h4>
              {renderStars()}
              {userRating && (
                <p className="rating-date">Rated on {new Date(userRating.timestamp).toLocaleDateString()}</p>
              )}
            </div>

            {/* Comment Section */}
            {(showCommentBox || userRating?.comment) && (
              <div className={`comment-section ${showCommentBox && !userRating ? "slide-in" : ""}`}>
                <label className="comment-label">
                  <MessageSquare className="comment-icon" />
                  Comment (optional):
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={userRating ? "Update your experience..." : "Share your experience..."}
                  className="comment-textarea"
                  rows={3}
                />
              </div>
            )}

            {/* Submit Button */}
            {selectedRating > 0 && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`submit-button ${isSubmitting ? "submitting" : ""} ${userRating ? "update-button" : "first-time-button"}`}
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner"></div>
                    {userRating ? "Updating..." : "Submitting..."}
                  </>
                ) : userRating ? (
                  <>
                    <Edit3 className="button-icon" />
                    Update Review
                  </>
                ) : (
                  <>
                    <CheckCircle className="button-icon" />
                    Submit Review
                  </>
                )}
              </button>
            )}

            {/* Existing Review Display */}
            {userRating && !showCommentBox && (
              <div className="existing-review">
                <div className="review-header">
                  <span className="review-title">Your Review</span>
                  <button onClick={() => setShowCommentBox(true)} className="edit-button">
                    <Edit3 className="edit-icon" />
                    Edit
                  </button>
                </div>
                {userRating.comment && <p className="review-comment">{userRating.comment}</p>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Submission Overlay */}
      {isSubmitting && (
        <div className="submission-overlay">
          <div className="submission-content">
            <div className="loading-spinner large"></div>
            <p className="submission-text">{userRating ? "Updating your review..." : "Submitting your review..."}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventReviews
