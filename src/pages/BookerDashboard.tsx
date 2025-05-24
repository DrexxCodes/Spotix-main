"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import Footer from "../components/footer"
import { PlusCircle, User, Ticket, BarChart2, Calendar, DollarSign, Tag, Clock, RefreshCw } from "lucide-react"
import BookersHeader from "../components/BookersHeader"
import {
  CACHE_KEYS,
  isCacheExpired,
  cacheDashboardData,
  getCachedDashboardData,
  shouldBackgroundRefresh,
} from "../utils/cacheUtils"
import "../booker-dashboard-override.css"
// import "../styles/dashboard.css"

interface DashboardStats {
  totalEvents: number
  activeEvents: number
  pastEvents: number
  totalRevenue: number
  availableBalance: number
  totalPaidOut: number
  totalTicketsSold: number
}

interface RecentEvent {
  id: string
  eventName: string
  eventDate: string
  ticketsSold: number
  revenue: number
  availableBalance: number
  status: string
}

interface DashboardData {
  stats: DashboardStats
  recentEvents: RecentEvent[]
  bookerName: string
  lastUpdated: number
}

const initialStats: DashboardStats = {
  totalEvents: 0,
  activeEvents: 0,
  pastEvents: 0,
  totalRevenue: 0,
  availableBalance: 0,
  totalPaidOut: 0,
  totalTicketsSold: 0,
}

const BookerDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [bookerName, setBookerName] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Format number with commas - memoized for performance
  const formatNumber = useMemo(() => {
    return (num: number): string => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    }
  }, [])

  // Format currency with commas - memoized for performance
  const formatCurrency = useMemo(() => {
    return (amount: number): string => {
      return `₦${formatNumber(Number.parseFloat(amount.toFixed(2)))}`
    }
  }, [formatNumber])

  // Fetch dashboard data function - extracted as a callback to be reusable
  const fetchDashboardData = useCallback(async (forceRefresh = false): Promise<DashboardData | null> => {
    try {
      const user = auth.currentUser
      if (!user) {
        setError("User not authenticated")
        return null
      }

      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = getCachedDashboardData()
        if (cachedData) {
          return cachedData
        }
      }

      // Get user data
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      let userName = "Booker"

      if (userDoc.exists()) {
        const userData = userDoc.data()
        userName = userData.username || userData.fullName || "Booker"
      }

      // Fetch events from the user's events collection
      const eventsCollectionRef = collection(db, "events", user.uid, "userEvents")
      const eventsSnapshot = await getDocs(eventsCollectionRef)

      const totalEvents = eventsSnapshot.size
      let activeEvents = 0
      let pastEvents = 0
      let totalRevenue = 0
      let totalPaidOut = 0
      let totalAvailableBalance = 0
      let totalTicketsSold = 0

      const recentEventsData: RecentEvent[] = []
      const eventPromises: Promise<void>[] = []

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data()
        const eventDate = new Date(eventData.eventDate)
        const isPast = eventDate < new Date()

        // Update counters
        if (isPast) {
          pastEvents++
        } else {
          activeEvents++
        }

        const eventRevenue = eventData.totalRevenue || 0
        totalRevenue += eventRevenue
        totalTicketsSold += eventData.ticketsSold || 0

        // Use stored financial data if available
        if (eventData.totalPaidOut !== undefined) {
          totalPaidOut += eventData.totalPaidOut
        }

        if (eventData.availableRevenue !== undefined) {
          totalAvailableBalance += eventData.availableRevenue

          // Add to recent events with stored values
          recentEventsData.push({
            id: eventDoc.id,
            eventName: eventData.eventName || "Unnamed Event",
            eventDate: eventData.eventDate || new Date().toISOString(),
            ticketsSold: eventData.ticketsSold || 0,
            revenue: eventRevenue,
            availableBalance: eventData.availableRevenue,
            status: isPast ? "past" : "active",
          })
        } else {
          // If stored values not available, fetch payouts to calculate
          const promise = (async () => {
            const payoutsCollectionRef = collection(db, "events", user.uid, "userEvents", eventDoc.id, "payouts")
            const payoutsSnapshot = await getDocs(payoutsCollectionRef)

            let eventPaidOut = 0
            payoutsSnapshot.forEach((payoutDoc) => {
              const payoutData = payoutDoc.data()
              if (payoutData.status === "Confirmed") {
                eventPaidOut += payoutData.payoutAmount || 0
              }
            })

            totalPaidOut += eventPaidOut
            const eventAvailableBalance = eventRevenue - eventPaidOut
            totalAvailableBalance += eventAvailableBalance

            // Add to recent events
            recentEventsData.push({
              id: eventDoc.id,
              eventName: eventData.eventName || "Unnamed Event",
              eventDate: eventData.eventDate || new Date().toISOString(),
              ticketsSold: eventData.ticketsSold || 0,
              revenue: eventRevenue,
              availableBalance: eventAvailableBalance,
              status: isPast ? "past" : "active",
            })
          })()

          eventPromises.push(promise)
        }
      }

      // Wait for all payout calculations to complete
      await Promise.all(eventPromises)

      // Sort by date (most recent first)
      recentEventsData.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

      // If we didn't calculate available balance from stored values, calculate now
      if (totalAvailableBalance === 0 && totalEvents > 0) {
        totalAvailableBalance = totalRevenue - totalPaidOut
      }

      const dashboardStats: DashboardStats = {
        totalEvents,
        activeEvents,
        pastEvents,
        totalRevenue,
        availableBalance: totalAvailableBalance,
        totalPaidOut,
        totalTicketsSold,
      }

      // Prepare data object with timestamp
      const dashboardData: DashboardData = {
        stats: dashboardStats,
        recentEvents: recentEventsData.slice(0, 5), // Show only the 5 most recent events
        bookerName: userName,
        lastUpdated: Date.now(),
      }

      // Save to cache
      cacheDashboardData(dashboardData)

      return dashboardData
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError("Failed to load dashboard data. Please try again.")
      return null
    }
  }, [])

  // Load data from cache or fetch new data
  const loadDashboardData = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsRefreshing(forceRefresh)

        const dashboardData = await fetchDashboardData(forceRefresh)

        if (dashboardData) {
          setStats(dashboardData.stats)
          setRecentEvents(dashboardData.recentEvents)
          setBookerName(dashboardData.bookerName)
          setError(null)
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [fetchDashboardData],
  )

  // Initial data load
  useEffect(() => {
    // First try to load from cache for instant display
    const cachedData = getCachedDashboardData()

    if (cachedData) {
      // If we have cached data, show it immediately
      setStats(cachedData.stats)
      setRecentEvents(cachedData.recentEvents)
      setBookerName(cachedData.bookerName)
      setLoading(false)

      // Then check if cache is expired or nearing expiration
      if (isCacheExpired(CACHE_KEYS.DASHBOARD_DATA) || shouldBackgroundRefresh(CACHE_KEYS.DASHBOARD_DATA)) {
        loadDashboardData(true)
      }
    } else {
      // No cache, load fresh data
      loadDashboardData(false)
    }

    // Set up periodic background refresh (every 2 minutes)
    const refreshInterval = setInterval(
      () => {
        loadDashboardData(true)
      },
      2 * 60 * 1000,
    )

    return () => clearInterval(refreshInterval)
  }, [loadDashboardData])

  // Handle manual refresh
  const handleRefresh = () => {
    loadDashboardData(true)
  }

  const handleCreateEvent = () => {
    navigate("/createEvent")
  }

  const handleViewAllEvents = () => {
    navigate("/bookertickets")
  }

  const handleViewEvent = (eventId: string) => {
    navigate(`/bookerticketinfo/${eventId}`)
  }

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      return "Good morning"
    } else if (hour >= 12 && hour < 18) {
      return "Good afternoon"
    } else {
      return "Good evening"
    }
  }

  // Show skeleton loading UI during initial load
  if (loading) {
    return (
      <>
        <BookersHeader />
        <div className="booker-dashboard-container">
          <div className="dashboard-header-container skeleton-header">
            <div className="dashboard-header">
              <div className="greeting-container">
                <div className="skeleton-text-large"></div>
              </div>
              <div className="skeleton-button"></div>
            </div>
          </div>

          <div className="dashboard-content">
            <div className="stats-grid">
              {Array(8)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="stat-card skeleton-card">
                    <div className="stat-icon skeleton-icon"></div>
                    <div className="stat-content">
                      <div className="skeleton-text-small"></div>
                      <div className="skeleton-text-medium"></div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="recent-events-section">
              <div className="section-header">
                <div className="skeleton-text-medium"></div>
                <div className="skeleton-button-small"></div>
              </div>

              <div className="events-table-container">
                <div className="skeleton-table">
                  <div className="skeleton-table-header"></div>
                  {Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <div key={index} className="skeleton-table-row"></div>
                    ))}
                </div>
              </div>

              <div className="mobile-events-cards">
                {Array(3)
                  .fill(0)
                  .map((_, index) => (
                    <div key={index} className="mobile-event-card skeleton-card">
                      <div className="mobile-event-header">
                        <div className="skeleton-text-medium"></div>
                        <div className="skeleton-badge"></div>
                      </div>
                      <div className="mobile-event-details">
                        {Array(4)
                          .fill(0)
                          .map((_, detailIndex) => (
                            <div key={detailIndex} className="mobile-event-detail">
                              <div className="skeleton-text-small"></div>
                              <div className="skeleton-text-small"></div>
                            </div>
                          ))}
                      </div>
                      <div className="skeleton-button"></div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="quick-actions">
              <div className="skeleton-text-medium"></div>
              <div className="actions-grid">
                {Array(4)
                  .fill(0)
                  .map((_, index) => (
                    <div key={index} className="action-card skeleton-action-card">
                      <div className="skeleton-icon"></div>
                      <div className="skeleton-text-small"></div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <BookersHeader />
      <Helmet>
        <title>Booker Dashboard</title>
        <meta name="description" content="Manage your events, view stats, and more." />
      </Helmet>
      <div className="booker-dashboard-container">
        <div className="dashboard-header-container">
          <div className="dashboard-header">
            <div className="greeting-container">
              <h1>
                {getTimeBasedGreeting()}, {bookerName}! Wagwan?
              </h1>
              {isRefreshing && <span className="refreshing-indicator">Refreshing...</span>}
            </div>
            <div className="header-actions">
              <button className="refresh-button" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`refresh-icon ${isRefreshing ? "spinning" : ""}`} size={16} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button className="create-event-button" onClick={handleCreateEvent}>
                <PlusCircle className="button-icon" size={18} />
                <span>Create New Event</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={handleRefresh}>Try Again</button>
          </div>
        )}

        {/* Dashboard content wrapper for proper containment */}
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Calendar size={20} />
              </div>
              <div className="stat-content">
                <h3>Total Events</h3>
                <p className="stat-value">{formatNumber(stats.totalEvents)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={20} />
              </div>
              <div className="stat-content">
                <h3>Active Events</h3>
                <p className="stat-value">{formatNumber(stats.activeEvents)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Calendar size={20} />
              </div>
              <div className="stat-content">
                <h3>Past Events</h3>
                <p className="stat-value">{formatNumber(stats.pastEvents)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <DollarSign size={20} />
              </div>
              <div className="stat-content">
                <h3>Total Revenue</h3>
                <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-icon">
                <DollarSign size={20} />
              </div>
              <div className="stat-content">
                <h3>Available Balance</h3>
                <p className="stat-value">{formatCurrency(stats.availableBalance)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <DollarSign size={20} />
              </div>
              <div className="stat-content">
                <h3>Total Paid Out</h3>
                <p className="stat-value">{formatCurrency(stats.totalPaidOut)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Tag size={20} />
              </div>
              <div className="stat-content">
                <h3>Tickets Sold</h3>
                <p className="stat-value">{formatNumber(stats.totalTicketsSold)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <User size={20} />
              </div>
              <div className="stat-content">
                <h3>Account State</h3>
                <p className="stat-value">
                  <span>Active</span>
                </p>
              </div>
            </div>
          </div>

          <div className="recent-events-section">
            <div className="section-header">
              <h2>Recent Events</h2>
              <button className="view-all-button" onClick={handleViewAllEvents}>
                View All
              </button>
            </div>

            <div className="events-table-container">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th className="hide-sm">Date</th>
                    <th className="hide-md">Tickets</th>
                    <th className="hide-md">Revenue</th>
                    <th className="hide-sm">Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <tr key={event.id}>
                        <td data-label="Event">{event.eventName}</td>
                        <td data-label="Date" className="hide-sm">
                          {new Date(event.eventDate).toLocaleDateString()}
                        </td>
                        <td data-label="Tickets" className="hide-md">
                          {formatNumber(event.ticketsSold)}
                        </td>
                        <td data-label="Revenue" className="hide-md">
                          {formatCurrency(event.revenue)}
                        </td>
                        <td data-label="Balance" className="hide-sm">
                          {formatCurrency(event.availableBalance)}
                        </td>
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
                      <td colSpan={7} className="no-events-message">
                        No events found. Create your first event!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile event cards - only shown on small screens */}
            <div className="mobile-events-cards">
              {recentEvents.length > 0 ? (
                recentEvents.map((event) => (
                  <div key={event.id} className="mobile-event-card">
                    <div className="mobile-event-header">
                      <h3>{event.eventName}</h3>
                      <span className={`status-badge status-${event.status}`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>
                    <div className="mobile-event-details">
                      <div className="mobile-event-detail">
                        <span className="detail-label">Date:</span>
                        <span className="detail-value">{new Date(event.eventDate).toLocaleDateString()}</span>
                      </div>
                      <div className="mobile-event-detail">
                        <span className="detail-label">Tickets:</span>
                        <span className="detail-value">{formatNumber(event.ticketsSold)}</span>
                      </div>
                      <div className="mobile-event-detail">
                        <span className="detail-label">Revenue:</span>
                        <span className="detail-value">{formatCurrency(event.revenue)}</span>
                      </div>
                      <div className="mobile-event-detail">
                        <span className="detail-label">Balance:</span>
                        <span className="detail-value">{formatCurrency(event.availableBalance)}</span>
                      </div>
                    </div>
                    <button className="mobile-view-button" onClick={() => handleViewEvent(event.id)}>
                      View Details
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-events-card">
                  <p>No events found. Create your first event!</p>
                </div>
              )}
            </div>
          </div>

          <div className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              <button className="action-card" onClick={() => navigate("/verifyticket")}>
                <Ticket className="action-icon" size={24} />
                <span className="action-text">Verify Ticket</span>
              </button>
              <button className="action-card" onClick={() => navigate("/bookerprofile")}>
                <User className="action-icon" size={24} />
                <span className="action-text">View Profile</span>
              </button>
              <button className="action-card" onClick={() => navigate("/createEvent")}>
                <PlusCircle className="action-icon" size={24} />
                <span className="action-text">Create Event</span>
              </button>
              <button className="action-card" onClick={() => navigate("/bookertickets")}>
                <BarChart2 className="action-icon" size={24} />
                <span className="action-text">All Events</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default BookerDashboard
