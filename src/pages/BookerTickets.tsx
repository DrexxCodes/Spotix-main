"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { Users } from 'lucide-react'
import "../tables.css"
// import "../styles/bookerTickets.css"


interface EventData {
  id: string
  eventName: string
  eventDate: string
  eventType: string
  isFree: boolean
  ticketsSold: number
  totalCapacity: number
  revenue: number
  status: "active" | "past" | "draft"
  eventVenue: string
  hasMaxSize: boolean
  ownerId?: string
  role?: string
}

const BookerTickets = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventData[]>([])
  const [collaboratedEvents, setCollaboratedEvents] = useState<EventData[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([])
  const [filteredCollaboratedEvents, setFilteredCollaboratedEvents] = useState<EventData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const user = auth.currentUser
        if (!user) return

        // Fetch events from the user's events collection
        const eventsCollectionRef = collection(db, "events", user.uid, "userEvents")
        const eventsSnapshot = await getDocs(eventsCollectionRef)

        const eventsData: EventData[] = []
        eventsSnapshot.forEach((doc) => {
          const data = doc.data()
          const eventDate = new Date(data.eventDate)
          const isPast = eventDate < new Date()

          eventsData.push({
            id: doc.id,
            eventName: data.eventName || "Unnamed Event",
            eventDate: data.eventDate || new Date().toISOString(),
            eventType: data.eventType || "Other",
            isFree: data.isFree || false,
            ticketsSold: data.ticketsSold || 0,
            totalCapacity: data.enableMaxSize ? Number.parseInt(data.maxSize) : 100,
            revenue: data.totalRevenue || 0,
            status: isPast ? "past" : "active",
            eventVenue: data.eventVenue || "No venue specified",
            hasMaxSize: data.enableMaxSize || false,
          })
        })

        setEvents(eventsData)
        setFilteredEvents(eventsData)

        // Fetch collaborated events
        await fetchCollaboratedEvents(user.uid)
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    const fetchCollaboratedEvents = async (userId: string) => {
      try {
        // Check if user has any collaborations
        const userCollaborationsRef = doc(db, "collaborations", userId)
        const userCollaborationsDoc = await getDoc(userCollaborationsRef)
        
        if (!userCollaborationsDoc.exists()) {
          return
        }
        
        const userData = userCollaborationsDoc.data()
        const collaborations = userData.events || []
        
        if (collaborations.length === 0) {
          return
        }
        
        const collaboratedEventsData: EventData[] = []
        
        // Fetch each collaborated event
        for (const collaboration of collaborations) {
          try {
            const eventOwnerRef = doc(db, "events", collaboration.ownerId, "userEvents", collaboration.eventId)
            const eventDoc = await getDoc(eventOwnerRef)
            
            if (eventDoc.exists()) {
              const data = eventDoc.data()
              const eventDate = new Date(data.eventDate)
              const isPast = eventDate < new Date()
              
              // Check if collaboration is enabled for this event
              if (data.enabledCollaboration !== true) {
                continue
              }
              
              collaboratedEventsData.push({
                id: eventDoc.id,
                eventName: data.eventName || "Unnamed Event",
                eventDate: data.eventDate || new Date().toISOString(),
                eventType: data.eventType || "Other",
                isFree: data.isFree || false,
                ticketsSold: data.ticketsSold || 0,
                totalCapacity: data.enableMaxSize ? Number.parseInt(data.maxSize) : 100,
                revenue: data.totalRevenue || 0,
                status: isPast ? "past" : "active",
                eventVenue: data.eventVenue || "No venue specified",
                hasMaxSize: data.enableMaxSize || false,
                ownerId: collaboration.ownerId,
                role: collaboration.role
              })
            }
          } catch (error) {
            console.error("Error fetching collaborated event:", error)
          }
        }
        
        setCollaboratedEvents(collaboratedEventsData)
        setFilteredCollaboratedEvents(collaboratedEventsData)
      } catch (error) {
        console.error("Error fetching collaborated events:", error)
      }
    }

    fetchEvents()
  }, [])

  useEffect(() => {
    // Filter events based on search query and status filter
    let filtered = events

    if (searchQuery) {
      filtered = filtered.filter(
        (event) =>
          event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.eventVenue.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((event) => event.status === statusFilter)
    }

    setFilteredEvents(filtered)

    // Filter collaborated events
    let filteredCollab = collaboratedEvents

    if (searchQuery) {
      filteredCollab = filteredCollab.filter(
        (event) =>
          event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.eventVenue.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filteredCollab = filteredCollab.filter((event) => event.status === statusFilter)
    }

    setFilteredCollaboratedEvents(filteredCollab)
  }, [searchQuery, statusFilter, events, collaboratedEvents])

  const handleViewEvent = (eventId: string, ownerId?: string) => {
    if (ownerId && ownerId !== auth.currentUser?.uid) {
      // This is a collaborated event, navigate to the collaborated event view
      navigate(`/collaborated-event/${ownerId}/${eventId}`)
    } else {
      // This is the user's own event
      navigate(`/bookerticketinfo/${eventId}`)
    }
  }

  const handleCreateEvent = () => {
    navigate("/createEvent")
  }

  const handleManageTeam = () => {
    navigate("/team")
  }

  if (loading) {
    return <Preloader />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getRoleBadge = (role: string) => {
    let className = "role-badge"
    
    switch (role) {
      case "admin":
        className += " role-admin"
        break
      case "checkin":
        className += " role-checkin"
        break
      case "accountant":
        className += " role-accountant"
        break
      default:
        break
    }
    
    return (
      <span className={className}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  return (
    <>
      <BookersHeader />
      <div className="booker-tickets-container">
        <div className="tickets-header">
          <h1>My Events</h1>
          <div className="header-actions">
            <button className="team-button" onClick={handleManageTeam}>
              <Users size={16} />
              Collaborators
              <span className="new-tag">New</span>
            </button>
            <button className="create-event-button" onClick={handleCreateEvent}>
              Create New Event
            </button>
          </div>
        </div>

        <div className="filters-container">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
            <option value="all">All Events</option>
            <option value="active">Active Events</option>
            <option value="past">Past Events</option>
            <option value="draft">Draft Events</option>
          </select>
        </div>

        {/* My Events Section */}
        <h2 className="section-title">My Events</h2>
        
        {/* Desktop Table View */}
        <div className="events-table-container">
          <table className="events-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Date</th>
                <th>Venue</th>
                <th>Type</th>
                <th>Tickets Sold</th>
                <th>Revenue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <tr key={event.id}>
                    <td data-label="Event Name">{event.eventName}</td>
                    <td data-label="Date">{formatDate(event.eventDate)}</td>
                    <td data-label="Venue">{event.eventVenue}</td>
                    <td data-label="Type">{event.eventType}</td>
                    <td data-label="Tickets Sold">
                      {event.hasMaxSize ? (
                        <>
                          {event.ticketsSold} / {event.totalCapacity}
                          <div className="progress-bar">
                            <div
                              className="progress"
                              style={{ width: `${(event.ticketsSold / event.totalCapacity) * 100}%` }}
                            ></div>
                          </div>
                        </>
                      ) : (
                        <>
                          {event.ticketsSold}
                          {/* Hide progress bar completely when no max size */}
                        </>
                      )}
                    </td>
                    <td data-label="Revenue">₦{event.revenue.toFixed(2)}</td>
                    <td data-label="Status">
                      <span className={`status-badge status-${event.status}`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <button className="view-event-button" onClick={() => handleViewEvent(event.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="no-events-message">
                    No events found. Create your first event!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - This will only show on mobile */}
        <div className="mobile-events-cards">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div key={event.id} className="mobile-event-card">
                <div className="mobile-event-header">
                  <h3 className="mobile-event-title">{event.eventName}</h3>
                  <span className={`status-badge status-${event.status}`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </span>
                </div>

                <div className="mobile-event-details">
                  <div className="mobile-event-detail">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">{formatDate(event.eventDate)}</span>
                  </div>
                  <div className="mobile-event-detail">
                    <span className="detail-label">Venue</span>
                    <span className="detail-value">{event.eventVenue}</span>
                  </div>
                  <div className="mobile-event-detail">
                    <span className="detail-label">Type</span>
                    <span className="detail-value">{event.eventType}</span>
                  </div>
                  <div className="mobile-event-detail">
                    <span className="detail-label">Tickets Sold</span>
                    <span className="detail-value">
                      {event.hasMaxSize ? (
                        <>
                          {event.ticketsSold} / {event.totalCapacity}
                          <div className="progress-bar">
                            <div
                              className="progress"
                              style={{ width: `${(event.ticketsSold / event.totalCapacity) * 100}%` }}
                            ></div>
                          </div>
                        </>
                      ) : (
                        event.ticketsSold
                      )}
                    </span>
                  </div>
                  <div className="mobile-event-detail">
                    <span className="detail-label">Revenue</span>
                    <span className="detail-value">₦{event.revenue.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mobile-event-footer">
                  <button className="mobile-view-button" onClick={() => handleViewEvent(event.id)}>
                    View Details
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-events-message">No events found. Create your first event!</div>
          )}
        </div>

        {/* Collaborated Events Section */}
        {collaboratedEvents.length > 0 && (
          <>
            <h2 className="section-title collaborated-title">Collaborated Events</h2>
            
            {/* Desktop Table View for Collaborated Events */}
            <div className="events-table-container">
              <table className="events-table collaborated-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Role</th>
                    <th>Tickets Sold</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollaboratedEvents.length > 0 ? (
                    filteredCollaboratedEvents.map((event) => (
                      <tr key={`${event.ownerId}-${event.id}`}>
                        <td data-label="Event Name">{event.eventName}</td>
                        <td data-label="Date">{formatDate(event.eventDate)}</td>
                        <td data-label="Venue">{event.eventVenue}</td>
                        <td data-label="Role">
                          {event.role && getRoleBadge(event.role)}
                        </td>
                        <td data-label="Tickets Sold">
                          {event.hasMaxSize ? (
                            <>
                              {event.ticketsSold} / {event.totalCapacity}
                              <div className="progress-bar">
                                <div
                                  className="progress"
                                  style={{ width: `${(event.ticketsSold / event.totalCapacity) * 100}%` }}
                                ></div>
                              </div>
                            </>
                          ) : (
                            <>
                              {event.ticketsSold}
                            </>
                          )}
                        </td>
                        <td data-label="Status">
                          <span className={`status-badge status-${event.status}`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <button 
                            className="view-event-button" 
                            onClick={() => handleViewEvent(event.id, event.ownerId)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="no-events-message">
                        No collaborated events match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View for Collaborated Events */}
            <div className="mobile-events-cards">
              {filteredCollaboratedEvents.length > 0 ? (
                filteredCollaboratedEvents.map((event) => (
                  <div key={`${event.ownerId}-${event.id}`} className="mobile-event-card collaborated-card">
                    <div className="mobile-event-header">
                      <h3 className="mobile-event-title">{event.eventName}</h3>
                      <span className={`status-badge status-${event.status}`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>

                    <div className="mobile-event-details">
                      <div className="mobile-event-detail">
                        <span className="detail-label">Date</span>
                        <span className="detail-value">{formatDate(event.eventDate)}</span>
                      </div>
                      <div className="mobile-event-detail">
                        <span className="detail-label">Venue</span>
                        <span className="detail-value">{event.eventVenue}</span>
                      </div>
                      <div className="mobile-event-detail">
                        <span className="detail-label">Role</span>
                        <span className="detail-value">
                          {event.role && getRoleBadge(event.role)}
                        </span>
                      </div>
                      <div className="mobile-event-detail">
                        <span className="detail-label">Tickets Sold</span>
                        <span className="detail-value">
                          {event.hasMaxSize ? (
                            <>
                              {event.ticketsSold} / {event.totalCapacity}
                              <div className="progress-bar">
                                <div
                                  className="progress"
                                  style={{ width: `${(event.ticketsSold / event.totalCapacity) * 100}%` }}
                                ></div>
                              </div>
                            </>
                          ) : (
                            event.ticketsSold
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mobile-event-footer">
                      <button 
                        className="mobile-view-button" 
                        onClick={() => handleViewEvent(event.id, event.ownerId)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-events-message">No collaborated events match your filters.</div>
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  )
}

export default BookerTickets
