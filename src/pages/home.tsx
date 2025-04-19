"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { auth, db } from "../services/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  collectionGroup,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import WalletDisplay from "../components/WalletDisplay"
import "boxicons/css/boxicons.min.css"

interface EventType {
  id: string
  eventId: string
  eventName: string
  eventImage: string
  eventDate: string
  eventType: string
  isFree: boolean
  ticketPrices: { policy: string; price: number }[]
  createdBy: string
  bookerName: string
  eventVenue: string
  likes?: number
  likedBy?: string[]
  isLiked?: boolean
}

const Home = () => {
  const [username, setUsername] = useState("")
  const [events, setEvents] = useState<EventType[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<EventType[]>([])
  const [pastEvents, setPassedEvents] = useState<EventType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [priceFilter, setPriceFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState<Record<string, boolean>>({})

  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser
        if (user) {
          const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)))
          if (!userDoc.empty) {
            setUsername(userDoc.docs[0].data().username)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    const fetchEvents = async () => {
      try {
        const user = auth.currentUser
        // Use collectionGroup to query all "userEvents" subcollections across all UIDs
        const userEventsQuery = collectionGroup(db, "userEvents")
        const eventsSnapshot = await getDocs(userEventsQuery)

        const eventList: EventType[] = []

        for (const doc of eventsSnapshot.docs) {
          const eventData = doc.data() as EventType
          // Process event data and check if current user has liked it
          const isLiked = user && eventData.likedBy ? eventData.likedBy.includes(user.uid) : false

          eventList.push({
            ...eventData,
            id: doc.id,
            likes: eventData.likes || 0,
            likedBy: eventData.likedBy || [],
            isLiked: isLiked,
          })
        }

        setEvents(eventList)

        // Sort events chronologically and separate into upcoming and past
        const now = new Date()
        const upcoming: EventType[] = []
        const past: EventType[] = []

        eventList.forEach((event) => {
          const eventDate = new Date(event.eventDate)
          if (eventDate >= now) {
            upcoming.push(event)
          } else {
            past.push(event)
          }
        })

        // Sort upcoming events by date (closest first)
        upcoming.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())

        // Sort past events by date (most recent first)
        past.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

        setUpcomingEvents(upcoming)
        setPassedEvents(past)
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
    fetchEvents()
  }, [])

  // Handle liking/unliking events
  const handleLikeEvent = async (event: EventType, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation to event details

    try {
      const user = auth.currentUser
      if (!user) {
        // Redirect to login if user is not authenticated
        navigate("/login")
        return
      }

      // Set liking state for this event to show loading
      setLiking((prev) => ({ ...prev, [event.id]: true }))

      const eventDocRef = doc(db, "events", event.createdBy, "userEvents", event.id)

      // Check if event exists
      const eventDoc = await getDoc(eventDocRef)
      if (!eventDoc.exists()) {
        console.error("Event not found")
        return
      }

      // Toggle like status
      const isCurrentlyLiked = event.isLiked

      if (isCurrentlyLiked) {
        // Unlike event
        await updateDoc(eventDocRef, {
          likes: (event.likes || 0) - 1,
          likedBy: arrayRemove(user.uid),
        })
      } else {
        // Like event
        await updateDoc(eventDocRef, {
          likes: (event.likes || 0) + 1,
          likedBy: arrayUnion(user.uid),
        })
      }

      // Update local state
      const updateEventInList = (eventsList: EventType[]) => {
        return eventsList.map((e) => {
          if (e.id === event.id) {
            return {
              ...e,
              isLiked: !isCurrentlyLiked,
              likes: isCurrentlyLiked ? (e.likes || 0) - 1 : (e.likes || 0) + 1,
              likedBy: isCurrentlyLiked
                ? (e.likedBy || []).filter((id) => id !== user.uid)
                : [...(e.likedBy || []), user.uid],
            }
          }
          return e
        })
      }

      setUpcomingEvents(updateEventInList(upcomingEvents))
      setPassedEvents(updateEventInList(pastEvents))
    } catch (error) {
      console.error("Error toggling like status:", error)
    } finally {
      // Reset liking state for this event
      setLiking((prev) => ({ ...prev, [event.id]: false }))
    }
  }

  // Navigate to event details
  const navigateToEvent = (creatorId: string, eventId: string) => {
    navigate(`/event/${creatorId}/${eventId}`)
  }

  // Filter logic
  const filterEvents = (eventList: EventType[]) => {
    return eventList.filter((event) => {
      const matchesSearch = searchQuery
        ? event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (event.eventId && event.eventId.toLowerCase().includes(searchQuery.toLowerCase()))
        : true

      const matchesType = filterType ? event.eventType === filterType : true
      const matchesPrice = priceFilter === "free" ? event.isFree : priceFilter === "paid" ? !event.isFree : true

      return matchesSearch && matchesType && matchesPrice
    })
  }

  const filteredUpcomingEvents = filterEvents(upcomingEvents)
  const filteredPastEvents = filterEvents(pastEvents)

  // Render event card
  const renderEventCard = (event: EventType, isPast = false) => (
    <div key={event.id} className="event-card" onClick={() => navigateToEvent(event.createdBy, event.id)}>
      <div className={`event-date-box ${isPast ? "past-event" : ""}`}>
        {new Date(event.eventDate).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </div>
      <img src={event.eventImage || "/placeholder.svg"} alt={event.eventName} className="event-image" />
      <div className="event-info">
        <h2 className="event-title">{event.eventName}</h2>
        <p className="event-type">{event.eventType}</p>
        <p className="event-venue">{event.eventVenue}</p>
        <p className="event-booker">By: {event.bookerName}</p>

        <div className="event-bottom-row">
          {event.isFree ? (
            <span className="event-price-free">Free</span>
          ) : (
            <span className="event-price-paid">Paid</span>
          )}

          <div className="event-likes">
            <button className="like-button" onClick={(e) => handleLikeEvent(event, e)} disabled={liking[event.id]}>
              {event.isLiked ? (
                <i className="bx bxs-heart like-icon liked"></i>
              ) : (
                <i className="bx bx-heart like-icon"></i>
              )}
              <span className="like-count">{event.likes || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="home-container">
      {loading ? (
        <Preloader loading={loading} />
      ) : (
        <>
          <UserHeader />
          <div className="home-header">
            <h1>Welcome, {username ? username : ""} to Spotix!</h1>
            <WalletDisplay />
          </div>

          <div className="search-filter-container">
            <input
              type="text"
              placeholder="Search by Event Name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-bar"
            />

            <select
              onChange={(e) => setFilterType(e.target.value)}
              value={filterType || ""}
              className="filter-dropdown"
            >
              <option value="">All Types</option>
              <option value="Night party">Night Party</option>
              <option value="Concert">Concert</option>
              <option value="Conference">Conference</option>
              <option value="Workshop">Workshop</option>
              <option value="Other">Other</option>
            </select>

            <select
              onChange={(e) => setPriceFilter(e.target.value)}
              value={priceFilter || ""}
              className="filter-dropdown"
            >
              <option value="">All Prices</option>
              <option value="free">Free Events</option>
              <option value="paid">Paid Events</option>
            </select>
          </div>

          {/* Upcoming Events Section */}
          <h2 className="events-section-title">Upcoming Events</h2>
          <div className="event-grid">
            {filteredUpcomingEvents.length > 0 ? (
              filteredUpcomingEvents.map((event) => renderEventCard(event))
            ) : (
              <div className="no-events-message">
                <p>No upcoming events found matching your criteria.</p>
              </div>
            )}
          </div>

          {/* Past Events Section */}
          <h2 className="events-section-title past-events-title">Past Events</h2>
          <div className="event-grid past-events-grid">
            {filteredPastEvents.length > 0 ? (
              filteredPastEvents.map((event) => renderEventCard(event, true))
            ) : (
              <div className="no-home-events-message">
                <p>No past events found matching your criteria.</p>
              </div>
            )}
          </div>

          <Footer />
        </>
      )}
    </div>
  )
}

export default Home
