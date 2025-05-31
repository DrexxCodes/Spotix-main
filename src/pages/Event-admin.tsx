"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, getDocs, query, where, limit, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"
import {
  ArrowLeft,
  Search,
  Loader2,
  Plus,
  Calendar,
  MapPin,
  Tag,
  User,
  CheckCircle,
  AlertCircle,
  Star,
  Palette,
} from "lucide-react"
// import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { checkCurrentUserIsAdmin } from "../services/admin"
import "boxicons/css/boxicons.min.css"

interface PublicEventType {
  eventName: string
  imageURL: string
  eventType: string
  venue: string
  eventStartDate: string
  freeOrPaid: boolean
  timestamp: any
  creatorID: string
  eventId: string
  bookerName?: string
}

interface FeaturedEvent {
  id: string
  eventName: string
  imageURL: string
  eventType: string
  venue: string
  eventStartDate: string
  freeOrPaid: boolean
  creatorID: string
  eventId: string
  bookerName: string
  addedAt: any
}

interface ThemedEvent extends FeaturedEvent {
  theme: string
  themeColor?: string
}

const EventAdmin = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<PublicEventType[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<PublicEventType | null>(null)
  const [activeTab, setActiveTab] = useState<"featured" | "themed">("featured")
  const [message, setMessage] = useState({ text: "", type: "" })
  const [adminName, setAdminName] = useState("")

  // Themed event specific states
  const [eventTheme, setEventTheme] = useState("")
  const [themeColor, setThemeColor] = useState("#6b2fa5")

  // Adding states
  const [addingToFeatured, setAddingToFeatured] = useState(false)
  const [addingToThemed, setAddingToThemed] = useState(false)
  const [fetchingOrganizerName, setFetchingOrganizerName] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const isAdmin = await checkCurrentUserIsAdmin()
        if (!isAdmin) {
          navigate("/home")
          return
        }

        // Get admin name
        const currentUser = auth.currentUser
        if (currentUser) {
          const adminDocRef = doc(db, "admins", currentUser.uid)
          const adminDoc = await getDoc(adminDocRef)

          if (adminDoc.exists()) {
            const adminData = adminDoc.data()
            setAdminName(adminData.name || currentUser.displayName || "Admin")
          } else {
            setAdminName(currentUser.displayName || "Admin")
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking admin status:", error)
        navigate("/home")
      }
    }

    checkAdminStatus()
  }, [navigate])

  const handleGoBack = () => {
    navigate(-1)
  }

  const searchEvents = async () => {
    if (!searchQuery.trim()) {
      setMessage({ text: "Please enter an event name to search", type: "error" })
      return
    }

    setSearching(true)
    setSearchResults([])
    setMessage({ text: "", type: "" })

    try {
      // Query publicEvents collection, searching only by event name
      const publicEventsQuery = query(
        collection(db, "publicEvents"),
        where("eventName", ">=", searchQuery.trim()),
        where("eventName", "<=", searchQuery.trim() + "\uf8ff"),
        limit(20),
      )

      const eventsSnapshot = await getDocs(publicEventsQuery)

      if (eventsSnapshot.empty) {
        setMessage({ text: "No events found with that name", type: "error" })
        setSearching(false)
        return
      }

      const eventList: PublicEventType[] = []

      // Process each event document
      for (const doc of eventsSnapshot.docs) {
        const eventData = doc.data() as PublicEventType

        // Make sure we're using the correct eventId from the document
        const event = {
          ...eventData,
          eventId: eventData.eventId || doc.id, // Use the eventId field if available, otherwise use doc.id
        }

        eventList.push(event)
      }

      setSearchResults(eventList)
    } catch (error) {
      console.error("Error searching events:", error)
      setMessage({ text: "Error searching events", type: "error" })
    } finally {
      setSearching(false)
    }
  }

  const fetchOrganizerName = async (creatorID: string) => {
    setFetchingOrganizerName(true)
    try {
      const userDocRef = doc(db, "users", creatorID)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        // Return username or fullName or default text
        return userData.username || userData.fullName || "Event Organizer"
      }
      return "Event Organizer"
    } catch (error) {
      console.error("Error fetching organizer name:", error)
      return "Event Organizer"
    } finally {
      setFetchingOrganizerName(false)
    }
  }

  const handleEventSelect = async (event: PublicEventType) => {
    setMessage({ text: "", type: "" })

    // Fetch the organizer name using the creatorID
    const organizerName = await fetchOrganizerName(event.creatorID)

    // Update the event with the fetched organizer name
    setSelectedEvent({
      ...event,
      bookerName: organizerName,
    })
  }

  const addToFeaturedEvents = async () => {
    if (!selectedEvent) return

    setAddingToFeatured(true)
    setMessage({ text: "", type: "" })

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("Admin not authenticated")
      }

      // Check if event already exists in featured events
      const featuredEventsQuery = query(collection(db, "featuredEvents"), where("eventId", "==", selectedEvent.eventId))

      const existingEvents = await getDocs(featuredEventsQuery)

      if (!existingEvents.empty) {
        setMessage({ text: "This event is already in featured events", type: "error" })
        setAddingToFeatured(false)
        return
      }

      // Add to featured events collection
      await addDoc(collection(db, "featuredEvents"), {
        eventName: selectedEvent.eventName,
        imageURL: selectedEvent.imageURL,
        eventType: selectedEvent.eventType,
        venue: selectedEvent.venue,
        eventStartDate: selectedEvent.eventStartDate,
        freeOrPaid: selectedEvent.freeOrPaid,
        creatorID: selectedEvent.creatorID,
        eventId: selectedEvent.eventId,
        bookerName: selectedEvent.bookerName || "Event Organizer",
        addedAt: serverTimestamp(),
        addedBy: currentUser.uid,
        addedByName: adminName,
      })

      setMessage({
        text: `Successfully added "${selectedEvent.eventName}" to featured events`,
        type: "success",
      })
      setSelectedEvent(null)
    } catch (error) {
      console.error("Error adding to featured events:", error)
      setMessage({
        text: `Failed to add to featured events: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setAddingToFeatured(false)
    }
  }

  const addToThemedEvents = async () => {
    if (!selectedEvent || !eventTheme.trim()) {
      setMessage({ text: "Please enter an event theme", type: "error" })
      return
    }

    setAddingToThemed(true)
    setMessage({ text: "", type: "" })

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("Admin not authenticated")
      }

      // Check if event already exists in themed events
      const themedEventsQuery = query(collection(db, "themedEvents"), where("eventId", "==", selectedEvent.eventId))

      const existingEvents = await getDocs(themedEventsQuery)

      if (!existingEvents.empty) {
        setMessage({ text: "This event is already in themed events", type: "error" })
        setAddingToThemed(false)
        return
      }

      // Add to themed events collection
      await addDoc(collection(db, "themedEvents"), {
        eventName: selectedEvent.eventName,
        imageURL: selectedEvent.imageURL,
        eventType: selectedEvent.eventType,
        venue: selectedEvent.venue,
        eventStartDate: selectedEvent.eventStartDate,
        freeOrPaid: selectedEvent.freeOrPaid,
        creatorID: selectedEvent.creatorID,
        eventId: selectedEvent.eventId,
        bookerName: selectedEvent.bookerName || "Event Organizer",
        theme: eventTheme.trim(),
        themeColor: themeColor,
        addedAt: serverTimestamp(),
        addedBy: currentUser.uid,
        addedByName: adminName,
      })

      setMessage({
        text: `Successfully added "${selectedEvent.eventName}" to themed events with theme "${eventTheme}"`,
        type: "success",
      })
      setSelectedEvent(null)
      setEventTheme("")
      setThemeColor("#6b2fa5")
    } catch (error) {
      console.error("Error adding to themed events:", error)
      setMessage({
        text: `Failed to add to themed events: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setAddingToThemed(false)
    }
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <Helmet>
        <title>Event Admin - Manage Featured & Themed Events - Spotix</title>
        <meta name="description" content="Admin interface for managing featured and themed events on Spotix." />
      </Helmet>
      {/* <UserHeader /> */}
      <div className="event-admin-container">
        <div className="event-admin-header">
          <div className="header-top">
            <button className="back-button" onClick={handleGoBack}>
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Event Administration</h1>
          </div>
          <p className="admin-subtitle">Manage featured and themed events for the landing page</p>
        </div>

        {message.text && (
          <div className={`message-container ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle size={20} className="message-icon" />
            ) : (
              <AlertCircle size={20} className="message-icon" />
            )}
            <p>{message.text}</p>
            <button className="close-message" onClick={() => setMessage({ text: "", type: "" })}>
              ×
            </button>
          </div>
        )}

        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === "featured" ? "active" : ""}`}
            onClick={() => setActiveTab("featured")}
          >
            <Star size={18} />
            Featured Events
          </button>
          <button
            className={`tab-button ${activeTab === "themed" ? "active" : ""}`}
            onClick={() => setActiveTab("themed")}
          >
            <Palette size={18} />
            Themed Events
          </button>
        </div>

        <div className="admin-content">
          <div className="search-section">
            <h2>Search Events by Name</h2>
            <div className="search-form">
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Enter exact event name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchEvents()}
                  disabled={searching}
                />
                <button className="search-button" onClick={searchEvents} disabled={searching || !searchQuery.trim()}>
                  {searching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  Search
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Search Results ({searchResults.length})</h3>
                <div className="events-grid">
                  {searchResults.map((event) => (
                    <div
                      key={event.eventId}
                      className={`event-result-card ${selectedEvent?.eventId === event.eventId ? "selected" : ""}`}
                      onClick={() => handleEventSelect(event)}
                    >
                      <div className="event-image">
                        <img src={event.imageURL || "/placeholder.svg"} alt={event.eventName} />
                      </div>
                      <div className="event-details">
                        <h4>{event.eventName}</h4>
                        <div className="event-meta">
                          <div className="meta-item">
                            <Tag size={14} />
                            <span>{event.eventType}</span>
                          </div>
                          <div className="meta-item">
                            <Calendar size={14} />
                            <span>{formatDate(event.eventStartDate)}</span>
                          </div>
                          <div className="meta-item">
                            <MapPin size={14} />
                            <span>{event.venue}</span>
                          </div>
                        </div>
                        <div className="event-price-tag">
                          <span className={!event.freeOrPaid ? "free" : "paid"}>
                            {!event.freeOrPaid ? "Free" : "Paid"}
                          </span>
                        </div>
                        <div className="event-id">
                          <small>Event ID: {event.eventId}</small>
                        </div>
                        <div className="event-creator">
                          <small>Creator ID: {event.creatorID}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedEvent && (
            <div className="selected-event-section">
              <h2>Selected Event Details</h2>
              <div className="selected-event-card">
                <div className="selected-event-image">
                  <img src={selectedEvent.imageURL || "/placeholder.svg"} alt={selectedEvent.eventName} />
                </div>
                <div className="selected-event-details">
                  <h3>{selectedEvent.eventName}</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <Tag size={16} />
                      <span>Type: {selectedEvent.eventType}</span>
                    </div>
                    <div className="detail-item">
                      <Calendar size={16} />
                      <span>Date: {formatDate(selectedEvent.eventStartDate)}</span>
                    </div>
                    <div className="detail-item">
                      <MapPin size={16} />
                      <span>Venue: {selectedEvent.venue}</span>
                    </div>
                    <div className="detail-item">
                      <User size={16} />
                      <span>
                        Organizer:{" "}
                        {fetchingOrganizerName ? "Loading..." : selectedEvent.bookerName || "Event Organizer"}
                      </span>
                    </div>
                  </div>
                  <div className="event-ids">
                    <div className="id-item">
                      <strong>Event ID:</strong> {selectedEvent.eventId}
                    </div>
                    <div className="id-item">
                      <strong>Creator ID:</strong> {selectedEvent.creatorID}
                    </div>
                  </div>
                  <div className="price-badge">
                    <span className={!selectedEvent.freeOrPaid ? "free" : "paid"}>
                      {!selectedEvent.freeOrPaid ? "Free Event" : "Paid Event"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="action-section">
                {activeTab === "featured" && (
                  <div className="featured-actions">
                    <h3>Add to Featured Events</h3>
                    <p>This event will appear in the featured events carousel on the landing page.</p>
                    <button className="add-featured-btn" onClick={addToFeaturedEvents} disabled={addingToFeatured}>
                      {addingToFeatured ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus size={18} />
                          Add to Featured Events
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activeTab === "themed" && (
                  <div className="themed-actions">
                    <h3>Add to Themed Events</h3>
                    <p>Add a custom theme to this event for the themed events section.</p>
                    <div className="theme-inputs">
                      <div className="input-group">
                        <label htmlFor="eventTheme">Event Theme</label>
                        <input
                          type="text"
                          id="eventTheme"
                          placeholder="e.g., Summer Vibes, Tech Innovation, Cultural Celebration"
                          value={eventTheme}
                          onChange={(e) => setEventTheme(e.target.value)}
                          disabled={addingToThemed}
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor="themeColor">Theme Color</label>
                        <div className="color-input-container">
                          <input
                            type="color"
                            id="themeColor"
                            value={themeColor}
                            onChange={(e) => setThemeColor(e.target.value)}
                            disabled={addingToThemed}
                          />
                          <span className="color-value">{themeColor}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="add-themed-btn"
                      onClick={addToThemedEvents}
                      disabled={addingToThemed || !eventTheme.trim()}
                    >
                      {addingToThemed ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus size={18} />
                          Add to Themed Events
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />

      <style>{`
        .event-admin-container {
          min-height: 100vh;
          background-color: #f8f9fa;
          padding: 2rem 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .event-admin-header {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 1px solid #ddd;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-button:hover {
          background-color: #f5f5f5;
        }

        .event-admin-header h1 {
          margin: 0;
          color: #333;
          font-size: 2rem;
          font-weight: 600;
        }

        .admin-subtitle {
          color: #666;
          margin: 0;
          font-size: 1.1rem;
        }

        .message-container {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          position: relative;
        }

        .message-container.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message-container.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .message-icon {
          margin-right: 0.75rem;
          flex-shrink: 0;
        }

        .message-container p {
          margin: 0;
          flex-grow: 1;
        }

        .close-message {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: inherit;
          padding: 0 0.5rem;
        }

        .admin-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          border: 1px solid #ddd;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .tab-button:hover {
          background-color: #f5f5f5;
        }

        .tab-button.active {
          background: #6b2fa5;
          color: white;
          border-color: #6b2fa5;
        }

        .admin-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .search-section h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .search-input-container {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .search-input-container input {
          flex-grow: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }

        .search-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #6b2fa5;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .search-button:hover:not(:disabled) {
          background: #5a2589;
        }

        .search-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .search-results h3 {
          margin-bottom: 1rem;
          color: #333;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .event-result-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .event-result-card:hover {
          border-color: #6b2fa5;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .event-result-card.selected {
          border-color: #6b2fa5;
          border-width: 2px;
          box-shadow: 0 4px 12px rgba(107, 47, 165, 0.2);
        }

        .event-image {
          height: 150px;
          overflow: hidden;
        }

        .event-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .event-details {
          padding: 1rem;
        }

        .event-details h4 {
          margin: 0 0 0.75rem 0;
          color: #333;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .event-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #666;
        }

        .event-price-tag {
          margin-bottom: 0.5rem;
        }

        .event-price-tag span {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .event-price-tag .free {
          background: #d4edda;
          color: #155724;
        }

        .event-price-tag .paid {
          background: #fff3cd;
          color: #856404;
        }

        .event-id, .event-creator {
          font-size: 0.8rem;
          color: #999;
          margin-top: 0.25rem;
        }

        .selected-event-section {
          border-top: 1px solid #eee;
          padding-top: 2rem;
          margin-top: 2rem;
        }

        .selected-event-section h2 {
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .selected-event-card {
          display: flex;
          gap: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .selected-event-image {
          width: 200px;
          height: 150px;
          flex-shrink: 0;
          border-radius: 8px;
          overflow: hidden;
        }

        .selected-event-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .selected-event-details h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.3rem;
          font-weight: 600;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #666;
        }

        .event-ids {
          background: #f0f0f0;
          border-radius: 6px;
          padding: 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .id-item {
          margin-bottom: 0.5rem;
        }

        .id-item:last-child {
          margin-bottom: 0;
        }

        .price-badge span {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .price-badge .free {
          background: #d4edda;
          color: #155724;
        }

        .price-badge .paid {
          background: #fff3cd;
          color: #856404;
        }

        .action-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .featured-actions h3,
        .themed-actions h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .featured-actions p,
        .themed-actions p {
          margin: 0 0 1.5rem 0;
          color: #666;
        }

        .theme-inputs {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-weight: 500;
          color: #333;
        }

        .input-group input {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }

        .color-input-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .color-input-container input[type="color"] {
          width: 50px;
          height: 40px;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
        }

        .color-value {
          font-family: monospace;
          color: #666;
          font-size: 0.9rem;
        }

        .add-featured-btn,
        .add-themed-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #6b2fa5;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .add-featured-btn:hover:not(:disabled),
        .add-themed-btn:hover:not(:disabled) {
          background: #5a2589;
        }

        .add-featured-btn:disabled,
        .add-themed-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Responsive styles */
        @media (max-width: 768px) {
          .event-admin-container {
            padding: 1rem 0.5rem;
          }

          .event-admin-header {
            padding: 1.5rem;
          }

          .admin-content {
            padding: 1.5rem;
          }

          .search-input-container {
            flex-direction: column;
          }

          .events-grid {
            grid-template-columns: 1fr;
          }

          .selected-event-card {
            flex-direction: column;
          }

          .selected-event-image {
            width: 100%;
            height: 200px;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .theme-inputs {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}

export default EventAdmin
