"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { Search, Ticket, Calendar, Clock, CheckCircle, XCircle } from "lucide-react"
import { getWithExpiry, setWithExpiry } from "../utils/cacheUtils"

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
}

const TicketHistory = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<TicketHistoryItem[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Cache key for ticket history
  const CACHE_KEY = "user_ticket_history"
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

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTickets(tickets)
    } else {
      const filtered = tickets.filter((ticket) =>
        ticket.ticketReference.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredTickets(filtered)
    }
  }, [searchQuery, tickets])

  const handleTicketClick = (ticketId: string) => {
    navigate(`/ticket-Info/${ticketId}`)
  }
  
  if (loading) {
    return <Preloader loading={loading} />
  }
  
  return (

    <div className="flex flex-col min-h-screen bg-gray-50">
      <UserHeader />


      {/* Fixed header section */}
      <div className="w-full bg-white shadow-sm ticket-history-container">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-[#6b2fa5] page-title">My Tickets</h1>

            <div className="relative search-container">
              <div className="absolute search-input-wrapper inset-y-0 left-3 flex items-center pointer-events-none search-icon">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent search-input"
              />
            </div>
          </div>
        </div>
      </div>

     {/* Scrollable content area */}
<div className="flex-grow container mx-auto px-4 py-6">
  {filteredTickets.length > 0 ? (
    <div className="tickets-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredTickets.map((ticket) => (
        <div
          key={ticket.id}
          onClick={() => handleTicketClick(ticket.id)}
          className="ticket-card bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
        >
          {/* Ticket Info */}
          <div className="p-4 border-b border-gray-100 ticket-card-content">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-[#6b2fa5]/10 rounded-full">
                <Ticket className="ticket-icon h-6 w-6 text-[#6b2fa5]" />
              </div>
              <div className="flex-1 min-w-0 ticket-details">
                <h3 className="ticket-event-name text-lg font-semibold text-gray-900 truncate">{ticket.eventName}</h3>
                <p className="ticket-type  text-sm text-gray-600">{ticket.ticketType}</p>
                <p className="ticket-price text-base font-medium text-[#6b2fa5]">₦{ticket.ticketPrice.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Ticket Date/Time */}
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex flex-col space-y-2">
              <div className=" ticket-date-time flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 ticket-date" />
                <span>{ticket.purchaseDate}</span>
              </div>
              <div className="ticket-time flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{ticket.purchaseTime}</span>
              </div>
            </div>
          </div>

          {/* Ticket Footer */}
          <div className="px-4 py-3 flex items-center justify-between bg-white border-t border-gray-100">
            <div className="flex items-center space-x-1">
              {ticket.verified ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">Verified</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">Not Verified</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">Ref: {ticket.ticketReference}</div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <Ticket className="h-12 w-12 text-[#6b2fa5]" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
      {searchQuery ? (
        <p className="text-gray-600 mb-6">No tickets match your search. Try a different reference.</p>
      ) : (
        <p className="text-gray-600 mb-6">You haven't purchased any tickets yet. Browse events to get started!</p>
      )}
      <button
        onClick={() => navigate("/home")}
        className="px-6 py-3 bg-[#6b2fa5] text-white rounded-lg font-medium hover:bg-[#6b2fa5]/90 transition-colors"
      >
        Browse Events
      </button>
    </div>
  )}
</div>

      <Footer />
    </div>
  )
}

export default TicketHistory
