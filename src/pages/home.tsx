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
  orderBy,
  limit,
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
  likes?: number
  likedBy?: string[]
  isLiked?: boolean
}

interface SearchSuggestion {
  eventName: string
  creatorID: string
  eventId: string
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
  const [events, setEvents] = useState<PublicEventType[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<PublicEventType[]>([])
  const [eventsToday, setEventsToday] = useState<PublicEventType[]>([])
  const [pastEvents, setPassedEvents] = useState<PublicEventType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [priceFilter, setPriceFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState<Record<string, boolean>>({})
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [networkFailed, setNetworkFailed] = useState(false)

  const navigate = useNavigate()

  // Cache key and duration
  const cacheKey = "home_public_events_data"
  const cacheDuration = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Format number with commas
  const formatNumber = useCallback((num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }, [])

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  // Check if event is happening today
  const isEventToday = (eventDate: string) => {
    const eventDay = new Date(eventDate).toISOString().split("T")[0]
    return eventDay === getTodayDate()
  }

  // Format today's date for display
  const formatTodayDate = () => {
    const today = new Date()
    return today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

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

      // Fetch from publicEvents collection with limit for upcoming events
      const publicEventsQuery = query(
        collection(db, "publicEvents"),
        orderBy("timestamp", "desc"),
        limit(50), // Get more to filter properly
      )
      const eventsSnapshot = await getDocs(publicEventsQuery)

      const eventList: PublicEventType[] = eventsSnapshot.docs.map((doc) => {
        const event = doc.data() as PublicEventType
        const isLiked = user && event.likedBy ? event.likedBy.includes(user.uid) : false
        return {
          ...event,
          likes: event.likes || 0,
          likedBy: event.likedBy || [],
          isLiked,
        }
      })

      setEvents(eventList)

      const now = new Date()
      const today = getTodayDate()

      // Separate events by timing
      const upcoming = eventList.filter((e) => {
        const eventDate = new Date(e.eventStartDate)
        return eventDate >= now && !isEventToday(e.eventStartDate)
      })

      const todayEvents = eventList.filter((e) => isEventToday(e.eventStartDate))

      const past = eventList.filter((e) => {
        const eventDate = new Date(e.eventStartDate)
        return eventDate < now && !isEventToday(e.eventStartDate)
      })

      // Sort and limit upcoming events to 10 most recent
      const sortedUpcoming = upcoming
        .sort((a, b) => new Date(a.eventStartDate).getTime() - new Date(b.eventStartDate).getTime())
        .slice(0, 10)

      const sortedToday = todayEvents.sort(
        (a, b) => new Date(a.eventStartDate).getTime() - new Date(b.eventStartDate).getTime(),
      )
      const sortedPast = past.sort(
        (a, b) => new Date(b.eventStartDate).getTime() - new Date(a.eventStartDate).getTime(),
      )

      setUpcomingEvents(sortedUpcoming)
      setEventsToday(sortedToday)
      setPassedEvents(sortedPast)

      // Cache the data with timestamp
      const cacheData = {
        events: eventList,
        upcoming: sortedUpcoming,
        today: sortedToday,
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
            setEventsToday(cachedData.today || [])
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

  // Handle search suggestions
  useEffect(() => {
    const fetchSearchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchSuggestions([])
        setShowSuggestions(false)
        return
      }

      try {
        const searchLower = searchQuery.toLowerCase()
        const suggestions = events
          .filter((event) => event.eventName.toLowerCase().includes(searchLower))
          .slice(0, 5) // Limit to 5 suggestions
          .map((event) => ({
            eventName: event.eventName,
            creatorID: event.creatorID,
            eventId: event.eventId,
          }))

        setSearchSuggestions(suggestions)
        setShowSuggestions(suggestions.length > 0)
      } catch (error) {
        console.error("Error fetching search suggestions:", error)
      }
    }

    const debounceTimer = setTimeout(fetchSearchSuggestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, events])

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery("")
    setShowSuggestions(false)
    navigate(`/event/${suggestion.creatorID}/${suggestion.eventId}`)
  }

  const handleLikeEvent = async (event: PublicEventType, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      setLiking((prev) => ({ ...prev, [event.eventId]: true }))

      // Update in the original nested structure for likes
      const eventRef = doc(db, "events", event.creatorID, "userEvents", event.eventId)
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
      const updateEvents = (events: PublicEventType[]) =>
        events.map((e) =>
          e.eventId === event.eventId
            ? { ...e, isLiked: !isLiked, likes: isLiked ? (e.likes || 0) - 1 : (e.likes || 0) + 1 }
            : e,
        )

      setUpcomingEvents(updateEvents)
      setEventsToday(updateEvents)
      setPassedEvents(updateEvents)
      setEvents(updateEvents)

      // Update cache
      const cachedDataString = sessionStorage.getItem(cacheKey)
      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString)

          cachedData.events = updateEvents(cachedData.events)
          cachedData.upcoming = updateEvents(cachedData.upcoming)
          cachedData.today = updateEvents(cachedData.today || [])
          cachedData.past = updateEvents(cachedData.past)

          sessionStorage.setItem(cacheKey, JSON.stringify(cachedData))
        } catch (error) {
          console.error("Error updating cached data:", error)
        }
      }
    } catch (error) {
      console.error("Error liking event:", error)
    } finally {
      setLiking((prev) => ({ ...prev, [event.eventId]: false }))
    }
  }

  const navigateToEvent = (creatorId: string, eventId: string) => {
    navigate(`/event/${creatorId}/${eventId}`)
  }

  const filterEvents = (list: PublicEventType[]) => {
    return list.filter((event) => {
      const matchesSearch = searchQuery
        ? event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.eventId?.toLowerCase().includes(searchQuery.toLowerCase())
        : true

      const matchesType = filterType ? event.eventType === filterType : true
      const matchesPrice = priceFilter === "free" ? !event.freeOrPaid : priceFilter === "paid" ? event.freeOrPaid : true

      return matchesSearch && matchesType && matchesPrice
    })
  }

  const renderEventCard = (event: PublicEventType, isPast = false, isToday = false) => (
    <div key={event.eventId} onClick={() => navigateToEvent(event.creatorID, event.eventId)} className="event-card">
      <div className="event-card-header">
        <span className={`event-price-tag ${!event.freeOrPaid ? "free" : "paid"}`}>
          {!event.freeOrPaid ? "Free" : "Paid"}
        </span>

        <span className={`event-date-tag ${isPast ? "past" : ""} ${isToday ? "today" : ""}`}>
          {new Date(event.eventStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="event-card-image">
        <img src={event.imageURL || "/placeholder.svg"} alt={event.eventName} />
      </div>

      <div className="event-card-content">
        <h2 className="event-title">{event.eventName}</h2>
        <p className="event-type">{event.eventType}</p>
        <p className="event-venue">{event.venue}</p>
      </div>

      <div className="event-card-footer">
        <button
          onClick={(e) => handleLikeEvent(event, e)}
          className="event-like-button"
          disabled={liking[event.eventId]}
        >
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
  const filteredTodayEvents = filterEvents(eventsToday)
  const filteredPastEvents = filterEvents(pastEvents)

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Spotix Event Home</title>
        <meta
          name="description"
          content="Find, book, and attend the best events on your campus. Discover concerts, night parties, workshops, religious events, and more on Spotix."
        />
        {/* Open Graph for social media */}
        <meta property="og:title" content="Spotix | Discover and Book Campus Events" />
        <meta
          property="og:description"
          content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix."
        />
        <meta property="og:image" content="/meta.png" />
        <meta property="og:url" content="https://spotix.com.ng" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Spotix | Discover and Book Campus Events" />
        <meta
          name="twitter:description"
          content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix."
        />
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
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search by Event Name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="search-bar"
            />
            {showSuggestions && (
              <div className="search-suggestions">
                {searchSuggestions.map((suggestion, index) => (
                  <div key={index} className="search-suggestion-item" onClick={() => handleSuggestionClick(suggestion)}>
                    {suggestion.eventName}
                  </div>
                ))}
              </div>
            )}
          </div>

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

        {/* Today's Date Block */}
        <div className="today-date-block">
          <span className="today-label">Today:</span>
          <span className="today-date">{formatTodayDate()}</span>
        </div>

        {/* Events Today Section */}
        {eventsToday.length > 0 && (
          <>
            <h2 className="section-title events-today-title">Events Today</h2>
            <div className="events-grid">
              {loading ? (
                renderSkeletons(4)
              ) : filteredTodayEvents.length > 0 ? (
                filteredTodayEvents.map((event) => renderEventCard(event, false, true))
              ) : (
                <p className="no-events-message">No events happening today match your filters.</p>
              )}
            </div>
          </>
        )}

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
