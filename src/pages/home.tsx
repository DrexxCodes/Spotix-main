"use client"

import { useEffect, useState } from "react"
import { auth, db } from "../services/firebase"
import { collection, getDocs, query, where, collectionGroup, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import WalletDisplay from "../components/WalletDisplay"
import LoginButton from "../components/loginBtn"

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
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const navigate = useNavigate()

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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const user = auth.currentUser
        const eventsSnapshot = await getDocs(collectionGroup(db, "userEvents"))

        const eventList: EventType[] = eventsSnapshot.docs.map(doc => {
          const event = doc.data() as EventType
          const isLiked = user && event.likedBy ? event.likedBy.includes(user.uid) : false
          return { ...event, id: doc.id, likes: event.likes || 0, likedBy: event.likedBy || [], isLiked }
        })

        setEvents(eventList)

        const now = new Date()
        const upcoming = eventList.filter(e => new Date(e.eventDate) >= now)
        const past = eventList.filter(e => new Date(e.eventDate) < now)

        setUpcomingEvents(upcoming.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()))
        setPassedEvents(past.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()))
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const handleLikeEvent = async (event: EventType, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      setLiking(prev => ({ ...prev, [event.id]: true }))

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

      setUpcomingEvents(prev => prev.map(e => e.id === event.id ? { ...e, isLiked: !isLiked, likes: isLiked ? (e.likes || 0) - 1 : (e.likes || 0) + 1 } : e))
      setPassedEvents(prev => prev.map(e => e.id === event.id ? { ...e, isLiked: !isLiked, likes: isLiked ? (e.likes || 0) - 1 : (e.likes || 0) + 1 } : e))

    } finally {
      setLiking(prev => ({ ...prev, [event.id]: false }))
    }
  }

  const navigateToEvent = (creatorId: string, eventId: string) => {
    navigate(`/event/${creatorId}/${eventId}`)
  }

  const filterEvents = (list: EventType[]) => {
    return list.filter(event => {
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
      className="relative bg-white rounded-lg shadow-md hover:shadow-lg transition p-4 flex flex-col cursor-pointer"
    >
      <div className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${isPast ? "bg-red-500 .event-date-box.past-event" : "bg-[#6b2fa5] event-date-box"} text-white`}>
        {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
      <img src={event.eventImage || "/placeholder.svg"} alt={event.eventName} className="w-full h-40 object-cover rounded-md mb-4" />
      <h2 className="text-lg font-bold text-gray-800 mb-1">{event.eventName}</h2>
      <p className="text-sm text-gray-500 mb-1">{event.eventType}</p>
      <p className="text-sm text-gray-500 mb-1">{event.eventVenue}</p>
      <p className="text-sm text-gray-500 mb-4">By: {event.bookerName}</p>

      <div className="flex justify-between items-center mt-auto">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${event.isFree ? "bg-green-100 text-green-700 event-price-free" : "bg-[#6b2fa5] text-white event-price-paid"}`}>
          {event.isFree ? "Free" : "Paid"}
        </span>

        <button
          onClick={(e) => handleLikeEvent(event, e)}
          className="flex items-center space-x-1 text-[#6b2fa5] text-sm"
          disabled={liking[event.id]}
        >
          {event.isLiked ? <i className="bx bxs-heart text-lg"></i> : <i className="bx bx-heart text-lg"></i>}
          <span>{event.likes || 0}</span>
        </button>
      </div>
    </div>
  )

  const filteredUpcomingEvents = filterEvents(upcomingEvents)
  const filteredPastEvents = filterEvents(pastEvents)

  return (
    <div className="flex flex-col min-h-screen">
      {loading ? (
        <Preloader loading={loading} />
      ) : (
        <>
          <UserHeader />

          <div className="p-6 home-container">
            <div className="text-center mb-8 home-header">
              <h1 className="text-3xl font-bold text-[#6b2fa5]">Welcome{isAuthenticated ? `, ${username}` : ""} to Spotix!</h1>
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
              {filteredUpcomingEvents.length > 0 ? (
                filteredUpcomingEvents.map(event => renderEventCard(event))
              ) : (
                <p className="text-center text-gray-500">No upcoming events found.</p>
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-4 past-events-title">Past Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredPastEvents.length > 0 ? (
                filteredPastEvents.map(event => renderEventCard(event, true))
              ) : (
                <p className="text-center text-gray-500">No past events found.</p>
              )}
            </div>
          </div>

          <Footer />
        </>
      )}
    </div>
  )
}

export default Home