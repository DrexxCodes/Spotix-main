"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { Helmet } from "react-helmet"
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
} from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import WalletDisplay from "../components/WalletDisplay"
import LoginButton from "../components/loginBtn"
import NotVerified from "../components/NotVerified"
import NoNetwork from "../components/noNetwork"
import "./home.css"

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

// Loading skeleton component for event cards
const EventCardSkeleton = () => (
  <div className="event-card-skeleton animate-pulse">
    <div className="skeleton-tag"></div>
    <div className="skeleton-date"></div>
    <div className="skeleton-image"></div>
    <div className="skeleton-title"></div>
    <div className="skeleton-type"></div>
    <div className="skeleton-venue"></div>
    <div className="skeleton-booker"></div>
    <div className="skeleton-footer">
      <div className="skeleton-price"></div>
      <div className="skeleton-likes"></div>
    </div>
  </div>
)

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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [networkFailed, setNetworkFailed] = useState(false)

  const navigate = useNavigate()

  // Cache key and duration
  const cacheKey = "home_events_data"
  const cacheDuration = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Format number with commas
  const formatNumber = useCallback((num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user)
      if (user) {
        const fetchUsername = async () => {
          const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)))
          if (!userDoc.empty) {
            setUsername(userDoc.docs[0].data().username)
          }
        }
        fetchUsername()
      }
    })
    return () => unsubscribe()
  }, [])

  const fetchFreshEvents = useCallback(async () => {
    try {
      const user = auth.currentUser
      const eventsSnapshot = await getDocs(collectionGroup(db, "userEvents"))

      const eventList: EventType[] = eventsSnapshot.docs.map((doc) => {
        const event = doc.data() as EventType
        const isLiked = user && event.likedBy ? event.likedBy.includes(user.uid) : false
        return { ...event, id: doc.id, likes: event.likes || 0, likedBy: event.likedBy || [], isLiked }
      })

      setEvents(eventList)

      const now = new Date()
      const upcoming = eventList.filter((e) => new Date(e.eventDate) >= now)
      const past = eventList.filter((e) => new Date(e.eventDate) < now)

      const sortedUpcoming = upcoming.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      const sortedPast = past.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

      setUpcomingEvents(sortedUpcoming)
      setPassedEvents(sortedPast)

      // Cache the data with timestamp
      const cacheData = {
        events: eventList,
        upcoming: sortedUpcoming,
        past: sortedPast,
        timestamp: Date.now(),
      }
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))

      return true
    } catch (error) {
      console.error("Error fetching events:", error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRetry = async () => {
    setLoading(true)
    setNetworkFailed(false)
    const result = await fetchFreshEvents()
    if (!result) setNetworkFailed(true)
  }

  useEffect(() => {
    const fetchEvents = async () => {
      // Try to get from cache first
      const cachedDataString = sessionStorage.getItem(cacheKey)

      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString)
          const now = Date.now()

          // Check if cache is still valid
          if (cachedData.timestamp && now - cachedData.timestamp < cacheDuration) {
            setEvents(cachedData.events)
            setUpcomingEvents(cachedData.upcoming)
            setPassedEvents(cachedData.past)
            setLoading(false)

            // Refresh in background after using cache
            fetchFreshEvents()
            return
          }
        } catch (error) {
          console.error("Error parsing cached data:", error)
        }
      }

      // No valid cache, fetch fresh data
      const result = await fetchFreshEvents()
      if (!result) setNetworkFailed(true)
    }

    fetchEvents()
  }, [cacheDuration, fetchFreshEvents])

  const handleLikeEvent = async (event: EventType, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      setLiking((prev) => ({ ...prev, [event.id]: true }))

      const eventRef = doc(db, "events", event.createdBy, "userEvents", event.id)
      const isLiked = event.isLiked

      if (isLiked) {
        await updateDoc(eventRef, {
          likes: (event.likes || 0) - 1,
          likedBy: arrayRemove(user.uid),
        })
      } else {
        await updateDoc(eventRef, {
          likes: (event.likes || 0) + 1,
          likedBy: arrayUnion(user.uid),
        })
      }

      // Update state
      const updateEvents = (events: EventType[]) =>
        events.map((e) =>
          e.id === event.id ? { ...e, isLiked: !isLiked, likes: isLiked ? (e.likes || 0) - 1 : (e.likes || 0) + 1 } : e,
        )

      setUpcomingEvents(updateEvents)
      setPassedEvents(updateEvents)
      setEvents(updateEvents)

      // Update cache
      const cachedDataString = sessionStorage.getItem(cacheKey)
      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString)

          cachedData.events = updateEvents(cachedData.events)
          cachedData.upcoming = updateEvents(cachedData.upcoming)
          cachedData.past = updateEvents(cachedData.past)

          sessionStorage.setItem(cacheKey, JSON.stringify(cachedData))
        } catch (error) {
          console.error("Error updating cached data:", error)
        }
      }
    } finally {
      setLiking((prev) => ({ ...prev, [event.id]: false }))
    }
  }

  const navigateToEvent = (creatorId: string, eventId: string) => {
    navigate(`/event/${creatorId}/${eventId}`)
  }

  const filterEvents = (list: EventType[]) => {
    return list.filter((event) => {
      const matchesSearch = searchQuery
        ? event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.eventId?.toLowerCase().includes(searchQuery.toLowerCase())
        : true

      const matchesType = filterType ? event.eventType === filterType : true
      const matchesPrice = priceFilter === "free" ? event.isFree : priceFilter === "paid" ? !event.isFree : true

      return matchesSearch && matchesType && matchesPrice
    })
  }

  const renderEventCard = (event: EventType, isPast = false) => (
    <div key={event.id} onClick={() => navigateToEvent(event.createdBy, event.id)} className="event-card">
      <div className="event-card-header">
        <span className={`event-price-tag ${event.isFree ? "free" : "paid"}`}>{event.isFree ? "Free" : "Paid"}</span>

        <span className={`event-date-tag ${isPast ? "past" : ""}`}>
          {new Date(event.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="event-card-image">
        <img src={event.eventImage || "/placeholder.svg"} alt={event.eventName} />
      </div>

      <div className="event-card-content">
        <h2 className="event-title">{event.eventName}</h2>
        <p className="event-type">{event.eventType}</p>
        <p className="event-venue">{event.eventVenue}</p>
        <p className="event-booker">By: {event.bookerName}</p>
      </div>

      <div className="event-card-footer">
        <button onClick={(e) => handleLikeEvent(event, e)} className="event-like-button" disabled={liking[event.id]}>
          {event.isLiked ? <i className="bx bxs-heart"></i> : <i className="bx bx-heart"></i>}
          <span>{formatNumber(event.likes || 0)}</span>
        </button>
      </div>
    </div>
  )

  const renderSkeletons = (count: number) =>
    Array(count)
      .fill(0)
      .map((_, index) => <EventCardSkeleton key={index} />)

  const filteredUpcomingEvents = filterEvents(upcomingEvents)
  const filteredPastEvents = filterEvents(pastEvents)

  return (
    <div className="flex flex-col min-h-screen">
      
      <Helmet>
  <title>Spotix Event Home</title>
  <meta name="description" content="Find, book, and attend the best events on your campus. Discover concerts, night parties, workshops, religious events, and more on Spotix." />
  {/* Open Graph for social media */}
  <meta property="og:title" content="Spotix | Discover and Book Campus Events" />
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

      <UserHeader />
      <NotVerified />
      {networkFailed && <NoNetwork retry={handleRetry} />}

      <div className="home-container">
        <div className="home-header">
          <h1>Welcome{isAuthenticated ? `, ${username}` : ""} to Spotix!</h1>
          {isAuthenticated ? <WalletDisplay /> : <LoginButton />}
        </div>

        <div className="search-filter-container">
          <input
            type="text"
            placeholder="Search by Event Name or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
          />
          <select value={filterType || ""} onChange={(e) => setFilterType(e.target.value)} className="filter-dropdown">
            <option value="">All Types</option>
            <option value="Night party">Night Party</option>
            <option value="Concert">Concert</option>
            <option value="Religious">Religious</option>
            <option value="Conference">Conference</option>
            <option value="Workshop">Workshop</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={priceFilter || ""}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="filter-dropdown"
          >
            <option value="">All Prices</option>
            <option value="free">Free Events</option>
            <option value="paid">Paid Events</option>
          </select>
        </div>

        <h2 className="section-title">Upcoming Events</h2>
        <div className="events-grid">
          {loading ? (
            renderSkeletons(8)
          ) : filteredUpcomingEvents.length > 0 ? (
            filteredUpcomingEvents.map((event) => renderEventCard(event))
          ) : (
            <p className="no-events-message">No upcoming events found.</p>
          )}
        </div>

        <h2 className="section-title past-events-title">Past Events</h2>
        <div className="events-grid">
          {loading ? (
            renderSkeletons(4)
          ) : filteredPastEvents.length > 0 ? (
            filteredPastEvents.map((event) => renderEventCard(event, true))
          ) : (
            <p className="no-events-message">No past events found.</p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default Home
