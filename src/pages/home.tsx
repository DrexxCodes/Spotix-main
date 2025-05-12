"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
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
  <div className="relative bg-white rounded-lg shadow-md p-4 flex flex-col animate-pulse">
    <div className="absolute top-3 right-3 h-6 w-16 bg-gray-200 rounded-full"></div>
    <div className="w-full h-40 bg-gray-200 rounded-md mb-4"></div>
    <div className="h-6 w-3/4 bg-gray-200 rounded-md mb-2"></div>
    <div className="h-4 w-1/2 bg-gray-200 rounded-md mb-1"></div>
    <div className="h-4 w-2/3 bg-gray-200 rounded-md mb-1"></div>
    <div className="h-4 w-1/2 bg-gray-200 rounded-md mb-4"></div>

    <div className="flex justify-between items-center mt-auto">
      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
      <div className="h-6 w-12 bg-gray-200 rounded-md"></div>
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
      await fetchFreshEvents()
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
    <div
      key={event.id}
      onClick={() => navigateToEvent(event.createdBy, event.id)}
      className="relative bg-white rounded-lg shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-300 ease-in-out p-4 flex flex-col cursor-pointer"
    >
      <div
        className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${isPast ? "bg-red-500 .event-date-box.past-event" : "bg-[#6b2fa5] event-date-box"} text-white`}
      >
        {new Date(event.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </div>
      <img
        src={event.eventImage || "/placeholder.svg"}
        alt={event.eventName}
        className="w-full h-40 object-cover rounded-md mb-4"
      />
      <h2 className="text-lg font-bold text-gray-800 mb-1">{event.eventName}</h2>
      <p className="text-sm text-gray-500 mb-1">{event.eventType}</p>
      <p className="text-sm text-gray-500 mb-1">{event.eventVenue}</p>
      <p className="text-sm text-gray-500 mb-4">By: {event.bookerName}</p>

      <div className="flex justify-between items-center mt-auto">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${event.isFree ? "bg-green-100 text-green-700 event-price-free" : "bg-[#6b2fa5] text-white event-price-paid"}`}
        >
          {event.isFree ? "Free" : "Paid"}
        </span>

        <button
          onClick={(e) => handleLikeEvent(event, e)}
          className="flex items-center space-x-1 text-[#6b2fa5] text-sm"
          disabled={liking[event.id]}
        >
          {event.isLiked ? <i className="bx bxs-heart text-lg"></i> : <i className="bx bx-heart text-lg"></i>}
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
  <NotVerified />
      <UserHeader />

      <div className="p-6 home-container">
        <div className="text-center mb-8 home-header">
          <h1 className="text-3xl font-bold text-[#6b2fa5]">
            Welcome{isAuthenticated ? `, ${username}` : ""} to Spotix!
          </h1>
          {isAuthenticated ? <WalletDisplay /> : <LoginButton />}
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-center mb-40px search-filter-container">
          <input
            type="text"
            placeholder="Search by Event Name or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full md:w-1/3 search-bar"
          />
          <select
            value={filterType || ""}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full md:w-1/4 filter-dropdown"
          >
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
            className="border rounded-lg px-4 py-2 w-full md:w-1/4 filter-dropdown"
          >
            <option value="">All Prices</option>
            <option value="free">Free Events</option>
            <option value="paid">Paid Events</option>
          </select>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">Upcoming Events</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
          {loading ? (
            renderSkeletons(8)
          ) : filteredUpcomingEvents.length > 0 ? (
            filteredUpcomingEvents.map((event) => renderEventCard(event))
          ) : (
            <p className="text-center text-gray-500 col-span-full">No upcoming events found.</p>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4 past-events-title">Past Events</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            renderSkeletons(4)
          ) : filteredPastEvents.length > 0 ? (
            filteredPastEvents.map((event) => renderEventCard(event, true))
          ) : (
            <p className="text-center text-gray-500 col-span-full">No past events found.</p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default Home
