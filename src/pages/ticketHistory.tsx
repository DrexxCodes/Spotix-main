"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import UserHeader from "../components/UserHeader"
import Search from "../components/search"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { Ticket, Calendar, Clock, RefreshCw, AlertTriangle } from "lucide-react"
import { getWithExpiry, setWithExpiry } from "../utils/cacheUtils"
import { ReviewCTA } from "../components/ReviewCTA"
import "./history.css"

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

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const handleTicketClick = (ticketId: string) => {
    navigate("/ticket-Info", { state: { ticketId } })
  }

  const handleRequestRefund = () => {
    navigate("/refund")
  }

  const handleTrackRefunds = () => {
    navigate("/refund-track")
  }

  if (loading) {
    return <Preloader loading={loading} />
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Helmet>
        <title>Spotix Ticket History</title>
        <meta
          name="description"
          content="Find, book, and attend the best events on your campus. Discover concerts, night parties, workshops, religious events, and more on Spotix."
        />
        <meta property="og:title" content="Spotix | Discover and Book Campus Events" />
        <meta
          property="og:description"
          content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix."
        />
        <meta property="og:image" content="/meta.png" />
        <meta property="og:url" content="https://spotix.com.ng" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Spotix | Discover and Book Campus Events" />
        <meta
          name="twitter:description"
          content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix."
        />
        <meta name="twitter:image" content="/meta.png" />
      </Helmet>
      <UserHeader />
      <Search></Search>

      {/* Fixed header section */}
      <div className="w-full bg-white shadow-sm ticket-history-container">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col space-y-6">
            {/* Title and Buttons Section */}
            <div className="flex flex-col space-y-4">
              <h1 className="text-2xl md:text-3xl font-bold text-[#6b2fa5] page-title text-center sm:text-left">
                My Tickets
              </h1>

              {/* Refund Action Buttons */}
              <div className="refund-buttons-container">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:justify-center lg:justify-start">
                  <button onClick={handleRequestRefund} className="refund-button refund-button-primary group">
                    <div className="button-content">
                      <AlertTriangle className="button-icon" />
                      <span className="button-text">Request Refund</span>
                    </div>
                    <div className="button-ripple"></div>
                  </button>

                  <button onClick={handleTrackRefunds} className="refund-button refund-button-secondary group">
                    <div className="button-content">
                      <RefreshCw className="button-icon group-hover:rotate-180" />
                      <span className="button-text">Track Refunds</span>
                    </div>
                    <div className="button-ripple"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="info-banner bg-gradient-to-r from-[#6b2fa5]/5 to-[#6b2fa5]/10 border border-[#6b2fa5]/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-[#6b2fa5] mt-0.5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[#6b2fa5] mb-1">Refund Information</h3>
                  <p className="text-sm text-gray-700">
                    You can request refunds for tickets purchased 2-7 days ago. Use the buttons above to request a
                    refund or track existing refund requests.
                  </p>
                </div>
              </div>
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
                      <h3 className="ticket-event-name text-lg font-semibold text-gray-900 truncate">
                        {ticket.eventName}
                      </h3>
                      <p className="ticket-type text-sm text-gray-600">{ticket.ticketType}</p>
                      <p className="ticket-price text-base font-medium text-[#6b2fa5]">
                        ₦{formatNumber(ticket.ticketPrice)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ticket Date/Time */}
                <div className="px-4 py-3 bg-gray-50">
                  <div className="flex flex-col space-y-2">
                    <div className="ticket-date-time flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 ticket-date" />
                      <span>{ticket.purchaseDate}</span>
                    </div>
                    <div className="ticket-time flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{ticket.purchaseTime}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 flex items-center justify-between bg-white border-t border-gray-100">
                  <div className="text-xs text-gray-500">Ref: {ticket.ticketReference}</div>
                  <div className="ticket-corner-fold"></div>
                </div>
              </div>
            ))}
            <ReviewCTA onReviewClick={undefined} />
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
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/home")}
                className="px-6 py-3 bg-[#6b2fa5] text-white rounded-lg font-medium hover:bg-[#6b2fa5]/90 transition-colors"
              >
                Browse Events
              </button>
              {!searchQuery && (
                <button
                  onClick={handleRequestRefund}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Request Refund
                </button>
              )}
            </div>
          </div>
        )}

{/* Custom Styles */}
      <style>{`
        .refund-buttons-container {
          display: flex;
          justify-content: center;
          width: 100%;
          margin-bottom: 1rem;
        }

        .refund-button {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 160px;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(107, 47, 165, 0.15);
          backdrop-filter: blur(10px);
        }

        .refund-button-primary {
          background: linear-gradient(135deg, #6b2fa5 0%, #8b5fbf 100%);
          color: white;
        }

        .refund-button-primary:hover {
          background: linear-gradient(135deg, #5a2589 0%, #7a4fa3 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(107, 47, 165, 0.3);
        }

        .refund-button-primary:active {
          transform: translateY(0);
          box-shadow: 0 4px 12px rgba(107, 47, 165, 0.2);
        }

        .refund-button-secondary {
          background: linear-gradient(135deg, rgba(107, 47, 165, 0.1) 0%, rgba(107, 47, 165, 0.05) 100%);
          color: #6b2fa5;
          border: 2px solid rgba(107, 47, 165, 0.2);
        }

        .refund-button-secondary:hover {
          background: linear-gradient(135deg, rgba(107, 47, 165, 0.15) 0%, rgba(107, 47, 165, 0.1) 100%);
          border-color: rgba(107, 47, 165, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(107, 47, 165, 0.2);
        }

        .refund-button-secondary:active {
          transform: translateY(0);
          box-shadow: 0 4px 12px rgba(107, 47, 165, 0.15);
        }

        .button-content {
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 2;
          position: relative;
        }

        .button-icon {
          width: 16px;
          height: 16px;
          transition: all 0.3s ease;
        }

        .button-text {
          font-weight: 600;
          letter-spacing: 0.025em;
        }

        .button-ripple {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
          z-index: 1;
        }

        .refund-button:active .button-ripple {
          width: 300px;
          height: 300px;
        }

        .search-section {
          margin-top: 1.5rem;
        }

        .search-input {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(107, 47, 165, 0.1);
        }

        .search-input:focus {
          background: rgba(255, 255, 255, 1);
          border-color: #6b2fa5;
          box-shadow: 0 0 0 4px rgba(107, 47, 165, 0.1);
        }

        .info-banner {
          backdrop-filter: blur(10px);
          border: 1px solid rgba(107, 47, 165, 0.2);
          animation: slideInUp 0.5s ease-out;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .refund-button:hover .button-icon {
          animation: pulse 1s infinite;
        }

        /* Mobile specific styles */
        @media (max-width: 640px) {
          .refund-buttons-container {
            padding: 0 1rem;
          }

          .refund-button {
            width: 100%;
            min-width: unset;
            padding: 14px 20px;
            font-size: 15px;
          }

          .search-section {
            margin-top: 2rem;
            padding: 0 1rem;
          }

          .info-banner {
            margin: 0 1rem;
          }
        }

        /* Tablet styles */
        @media (min-width: 641px) and (max-width: 1024px) {
          .refund-buttons-container {
            justify-content: center;
          }

          .refund-button {
            min-width: 180px;
          }
        }

        /* Desktop styles */
        @media (min-width: 1025px) {
          .refund-buttons-container {
            justify-content: flex-start;
          }
        }
      `}</style>

      </div>

      <Footer />
    </div>
  )
}

export default TicketHistory
