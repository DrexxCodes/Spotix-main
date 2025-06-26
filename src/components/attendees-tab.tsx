"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { ChevronUp, User, Mail, ShoppingCart, Calendar, Shield } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import "./attendees-tab.css"

interface AttendeeData {
  id: string
  fullName: string
  email: string
  ticketType: string
  verified: boolean
  purchaseDate: string
  purchaseTime: string
  ticketReference: string
  totalPurchases?: number
  purchaseHistory?: Array<{
    eventName: string
    ticketType: string
    purchaseDate: string
    amount: number
  }>
}

interface AttendeesTabProps {
  attendees: AttendeeData[]
  formatFirestoreTimestamp: (timestamp: any) => string
}

const AttendeesTabSkeleton = () => (
  <div className="attendees-tab">
    <div className="skeleton-text skeleton-title"></div>
    <div className="attendees-table-container">
      <table className="attendees-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Name</th>
            <th>Email</th>
            <th>Ticket Type</th>
            <th>Purchase Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, i) => (
            <tr key={i}>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-badge"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const AttendeesTab: React.FC<AttendeesTabProps> = ({ attendees, formatFirestoreTimestamp }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all")
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeData | null>(null)
  const [showPurchasePattern, setShowPurchasePattern] = useState(false)

  // Filter and search logic
  const filteredAttendees = useMemo(() => {
    return attendees.filter((attendee) => {
      const matchesSearch =
        attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.fullName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter =
        verificationFilter === "all" ||
        (verificationFilter === "verified" && attendee.verified) ||
        (verificationFilter === "unverified" && !attendee.verified)

      return matchesSearch && matchesFilter
    })
  }, [attendees, searchTerm, verificationFilter])

  // Get all purchases for a specific attendee (by email)
  const getAttendeePurchases = (attendeeEmail: string) => {
    return attendees.filter((attendee) => attendee.email === attendeeEmail)
  }

  // Generate real purchase pattern data with enhanced analytics
  const generateRealPurchasePatternData = (attendee: AttendeeData) => {
    const attendeePurchases = getAttendeePurchases(attendee.email)

    // Process monthly purchases
    const monthlyData: { [key: string]: number } = {}
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // Initialize all months with 0
    months.forEach((month) => {
      monthlyData[month] = 0
    })

    // Process daily purchases with ticket type distinction
    const dailyPurchases: { [key: string]: { [ticketType: string]: number } } = {}
    const ticketTypeColors: { [key: string]: string } = {}
    const colorPalette = ["#6b2fa5", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f3e8ff"]

    // Process verification status
    let verifiedCount = 0
    let unverifiedCount = 0

    // Count purchases by month, day, and verification status
    attendeePurchases.forEach((purchase: AttendeeData, index) => {
      try {
        let purchaseDate: Date

        // Handle different date formats
        if (typeof purchase.purchaseDate === "string") {
          purchaseDate = new Date(purchase.purchaseDate)
        } else if (
          purchase.purchaseDate &&
          typeof purchase.purchaseDate === "object" &&
          "seconds" in (purchase.purchaseDate as { seconds?: number })
        ) {
          // Firestore timestamp
          purchaseDate = new Date((purchase.purchaseDate as { seconds: number }).seconds * 1000)
        } else {
          purchaseDate = new Date(purchase.purchaseDate)
        }

        if (!isNaN(purchaseDate.getTime())) {
          // Monthly data
          const monthIndex = purchaseDate.getMonth()
          const monthName = months[monthIndex]
          monthlyData[monthName]++

          // Daily data with ticket type distinction
          const dayKey = purchaseDate.toISOString().split("T")[0] // YYYY-MM-DD format
          const ticketType = purchase.ticketType || "Unknown"

          if (!dailyPurchases[dayKey]) {
            dailyPurchases[dayKey] = {}
          }
          dailyPurchases[dayKey][ticketType] = (dailyPurchases[dayKey][ticketType] || 0) + 1

          // Assign colors to ticket types
          if (!ticketTypeColors[ticketType]) {
            const colorIndex = Object.keys(ticketTypeColors).length % colorPalette.length
            ticketTypeColors[ticketType] = colorPalette[colorIndex]
          }
        }

        // Verification status
        if (purchase.verified) {
          verifiedCount++
        } else {
          unverifiedCount++
        }
      } catch (error) {
        console.warn("Error parsing purchase date:", purchase.purchaseDate)
      }
    })

    const monthlyPurchases = months.map((month) => ({
      month,
      purchases: monthlyData[month],
    }))

    // Process ticket type distribution
    const ticketTypeData: { [key: string]: number } = {}
    attendeePurchases.forEach((purchase) => {
      const ticketType = purchase.ticketType || "Unknown"
      ticketTypeData[ticketType] = (ticketTypeData[ticketType] || 0) + 1
    })

    const ticketTypeDistribution = Object.entries(ticketTypeData).map(([name, value]) => ({
      name,
      value,
      color: ticketTypeColors[name] || "#6b2fa5",
    }))

    // Convert daily purchases to chart format
    const dailyPurchaseData = Object.entries(dailyPurchases)
      .map(([date, ticketTypes]) => {
        const dataPoint: any = { date: new Date(date).toLocaleDateString() }
        Object.entries(ticketTypes).forEach(([ticketType, count]) => {
          dataPoint[ticketType] = count
        })
        return dataPoint
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Verification status data
    const verificationData = [
      { name: "Verified", value: verifiedCount, color: "#10b981" },
      { name: "Unverified", value: unverifiedCount, color: "#f59e0b" },
    ]

    return {
      monthlyPurchases,
      ticketTypeDistribution,
      dailyPurchaseData,
      verificationData,
      ticketTypeColors,
      totalPurchases: attendeePurchases.length,
    }
  }

  const handleRowClick = (attendee: AttendeeData) => {
    if (selectedAttendee?.id === attendee.id) {
      setSelectedAttendee(null)
      setShowPurchasePattern(false)
    } else {
      setSelectedAttendee(attendee)
      setShowPurchasePattern(true)
    }
  }

  const purchasePatternData = selectedAttendee ? generateRealPurchasePatternData(selectedAttendee) : null

  return (
    <div className="attendees-tab">
      <div className="attendees-header">
        <h3>Attendees List</h3>

        {/* Search and Filter Controls */}
        <div className="attendees-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-container">
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value as "all" | "verified" | "unverified")}
              className="filter-select"
            >
              <option value="all">All Attendees</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="attendees-table-container">
        <table className="attendees-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Name</th>
              <th>Email</th>
              <th>Ticket Type</th>
              <th>Purchase Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendees.length > 0 ? (
              filteredAttendees.map((attendee) => (
                <tr
                  key={attendee.id}
                  onClick={() => handleRowClick(attendee)}
                  className={`attendee-row ${selectedAttendee?.id === attendee.id ? "selected" : ""}`}
                >
                  <td className="reference-cell">{attendee.ticketReference}</td>
                  <td>{attendee.fullName}</td>
                  <td className="email-cell">{attendee.email}</td>
                  <td>
                    <span className="ticket-type-badge">{attendee.ticketType}</span>
                  </td>
                  <td>{formatFirestoreTimestamp(attendee.purchaseDate)}</td>
                  <td>
                    <span className={`status-badge ${attendee.verified ? "status-verified" : "status-pending"}`}>
                      {attendee.verified ? "Verified" : "Not Verified"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no-attendees-message">
                  {searchTerm || verificationFilter !== "all"
                    ? "No attendees match your search criteria."
                    : "No attendees yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Purchase Pattern Section */}
      <div className="purchase-pattern-section">
        {!showPurchasePattern ? (
          <div className="purchase-pattern-placeholder">
            <User size={32} className="placeholder-icon" />
            <h4>Purchase Pattern Analytics</h4>
            <p>Select an attendee to see purchase patterns</p>
            <div className="placeholder-features">
              <div className="feature-item">
                <Calendar size={16} />
                <span>Daily purchase timeline</span>
              </div>
              <div className="feature-item">
                <ShoppingCart size={16} />
                <span>Ticket type distribution</span>
              </div>
              <div className="feature-item">
                <Shield size={16} />
                <span>Verification status</span>
              </div>
            </div>
          </div>
        ) : (
          selectedAttendee &&
          purchasePatternData && (
            <div className="purchase-pattern-container">
              <div className="purchase-pattern-header">
                <div className="pattern-title">
                  <User size={20} />
                  <h4>Purchase Pattern - {selectedAttendee.fullName}</h4>
                  <button className="collapse-btn" onClick={() => setShowPurchasePattern(false)}>
                    <ChevronUp size={18} />
                  </button>
                </div>
              </div>

              <div className="purchase-pattern-content">
                <div className="pattern-info-grid">
                  <div className="pattern-info-card">
                    <Mail size={18} />
                    <div>
                      <label>Email</label>
                      <p>{selectedAttendee.email}</p>
                    </div>
                  </div>

                  <div className="pattern-info-card">
                    <User size={18} />
                    <div>
                      <label>Full Name</label>
                      <p>{selectedAttendee.fullName}</p>
                    </div>
                  </div>

                  <div className="pattern-info-card">
                    <ShoppingCart size={18} />
                    <div>
                      <label>Total Purchases</label>
                      <p>{purchasePatternData.totalPurchases}</p>
                    </div>
                  </div>
                </div>

                <div className="pattern-charts-grid">
                  <div className="chart-container">
                    <h5>Monthly Purchase Activity</h5>
                    {purchasePatternData.monthlyPurchases.some((data) => data.purchases > 0) ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={purchasePatternData.monthlyPurchases}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="purchases" fill="#6b2fa5" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data-message">
                        <p>No monthly purchase data available</p>
                      </div>
                    )}
                  </div>

                  <div className="chart-container">
                    <h5>Ticket Type Distribution</h5>
                    {purchasePatternData.ticketTypeDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={purchasePatternData.ticketTypeDistribution}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {purchasePatternData.ticketTypeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data-message">
                        <p>No ticket type data available</p>
                      </div>
                    )}
                  </div>

                  <div className="chart-container">
                    <h5>Daily Purchase Timeline</h5>
                    {purchasePatternData.dailyPurchaseData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={purchasePatternData.dailyPurchaseData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {Object.keys(purchasePatternData.ticketTypeColors).map((ticketType) => (
                            <Bar
                              key={ticketType}
                              dataKey={ticketType}
                              stackId="tickets"
                              fill={purchasePatternData.ticketTypeColors[ticketType]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data-message">
                        <p>No daily purchase data available</p>
                      </div>
                    )}
                  </div>

                  <div className="chart-container">
                    <h5>Verification Status</h5>
                    {purchasePatternData.verificationData.some((data) => data.value > 0) ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={purchasePatternData.verificationData}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {purchasePatternData.verificationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data-message">
                        <p>No verification data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default AttendeesTab
export { AttendeesTabSkeleton }
