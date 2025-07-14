"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, query, limit, getDocs, orderBy } from "firebase/firestore"
import { db } from "../services/firebase"
import { Calendar, MapPin } from "lucide-react"
import { useParams } from "react-router-dom"

interface BookerDetailsTabProps {
  bookerDetails: {
    username: string
    email: string
    phone: string
    isVerified: boolean
  } | null
  bookerName: string
  creatorId: string
}

interface SuggestedEvent {
  id: string
  eventName: string
  eventImage: string
  eventDate: string
  eventVenue: string
  ticketsSold?: number
}

const BookerDetailsTab: React.FC<BookerDetailsTabProps> = ({ bookerDetails, bookerName, creatorId }) => {
  const [suggestedEvents, setSuggestedEvents] = useState<SuggestedEvent[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const { id: currentEventId } = useParams<{ id: string }>() // Get current event ID from URL

  useEffect(() => {
    const fetchSuggestedEvents = async () => {
      if (!creatorId) return

      setLoadingSuggestions(true)
      try {
        const eventsRef = collection(db, "events", creatorId, "userEvents")
        const q = query(eventsRef, orderBy("createdAt", "desc"), limit(10)) // Fetch more to filter out current
        const querySnapshot = await getDocs(q)

        const events: SuggestedEvent[] = []
        querySnapshot.forEach((doc) => {
          // Exclude the current event being viewed
          if (doc.id !== currentEventId) {
            const data = doc.data()
            events.push({
              id: doc.id,
              eventName: data.eventName,
              eventImage: data.eventImage,
              eventDate: data.eventDate,
              eventVenue: data.eventVenue,
              ticketsSold: data.ticketsSold || 0,
            })
          }
        })

        // Shuffle and take 3 random events (excluding current event)
        const shuffled = events.sort(() => 0.5 - Math.random())
        setSuggestedEvents(shuffled.slice(0, 3))
      } catch (error) {
        console.error("Error fetching suggested events:", error)
      } finally {
        setLoadingSuggestions(false)
      }
    }

    fetchSuggestedEvents()
  }, [creatorId, currentEventId]) // Add currentEventId as dependency

  const handleEventClick = (eventId: string) => {
    window.open(`/event/${creatorId}/${eventId}`, "_blank")
  }

  return (
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

      {/* Suggested Events Section */}
      <div className="suggested-events-section">
        <h3>You might also like these events from {bookerName}</h3>

        {loadingSuggestions ? (
          <div className="loading-suggestions">
            <div className="suggestions-skeleton">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="suggestion-skeleton-card">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-title"></div>
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : suggestedEvents.length > 0 ? (
          <div className="suggested-events-grid">
            {suggestedEvents.map((event) => (
              <div key={event.id} className="suggested-event-card" onClick={() => handleEventClick(event.id)}>
                <div className="event-image-container">
                  <img src={event.eventImage || "/placeholder.svg"} alt={event.eventName} className="event-image" />
                </div>
                <div className="event-info">
                  <h4 className="event-name">{event.eventName}</h4>
                  <div className="event-meta">
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                    </div>
                    <div className="meta-item">
                      <MapPin size={14} />
                      <span>{event.eventVenue}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-suggestions">
            <p>No other events available from this organizer at the moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookerDetailsTab
