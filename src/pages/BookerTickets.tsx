"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { collection, getDocs } from "firebase/firestore"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"

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
}

const BookerTickets = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventData[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([])
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
          })
        })

        setEvents(eventsData)
        setFilteredEvents(eventsData)
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
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
  }, [searchQuery, statusFilter, events])

  const handleViewEvent = (eventId: string) => {
    navigate(`/booker-ticket-info/${eventId}`)
  }

  const handleCreateEvent = () => {
    navigate("/createEvent")
  }

  if (loading) {
    return <Preloader />
  }

  return (
    <>
      <BookersHeader />
      <div className="booker-tickets-container">
        <div className="tickets-header">
          <h1>My Events</h1>
          <button className="create-event-button" onClick={handleCreateEvent}>
            Create New Event
          </button>
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
                    <td>{event.eventName}</td>
                    <td>{new Date(event.eventDate).toLocaleDateString()}</td>
                    <td>{event.eventVenue}</td>
                    <td>{event.eventType}</td>
                    <td>
                      {event.ticketsSold} / {event.totalCapacity}
                      <div className="progress-bar">
                        <div
                          className="progress"
                          style={{ width: `${(event.ticketsSold / event.totalCapacity) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td>${event.revenue.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${event.status}`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </td>
                    <td>
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
      </div>
      <Footer />
    </>
  )
}

export default BookerTickets

