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
import "../styles/ticket.css"

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
    <>
      <UserHeader />
      <div className="ticket-history-container">
        <h1 className="page-title">My Tickets</h1>

        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <Search className="search-icon" size={20} />
          </div>
        </div>

        {filteredTickets.length > 0 ? (
          <div className="tickets-grid">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="ticket-card" onClick={() => handleTicketClick(ticket.id)}>
                <div className="ticket-card-content">
                  <div className="ticket-icon">
                    <Ticket size={24} />
                  </div>
                  <div className="ticket-details">
                    <h3 className="ticket-event-name">{ticket.eventName}</h3>
                    <p className="ticket-type">{ticket.ticketType}</p>
                    <p className="ticket-price">₦{ticket.ticketPrice.toFixed(2)}</p>  

                    <div className="ticket-date-time">
                      <div className="ticket-date">
                        <Calendar size={14} />
                        <span>{ticket.purchaseDate}</span>
                      </div>
                      <div className="ticket-time">
                        <Clock size={14} />
                        <span>{ticket.purchaseTime}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ticket-footer">
                  <div className="ticket-status">
                    {ticket.verified ? (
                      <>
                        <CheckCircle size={16} className="verified-icon" />
                        <span className="verified-text">Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="unverified-icon" />
                        <span className="unverified-text">Not Verified</span>
                      </>
                    )}
                  </div>
                  <div className="ticket-reference">Ref: {ticket.ticketReference}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-tickets-message">
            <Ticket size={48} />
            <h3>No tickets found</h3>
            {searchQuery ? (
              <p>No tickets match your search. Try a different reference.</p>
            ) : (
              <p>You haven't purchased any tickets yet. Browse events to get started!</p>
            )}
            <button className="browse-events-btn" onClick={() => navigate("/home")}>
              Browse Events
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default TicketHistory

