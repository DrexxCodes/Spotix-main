"use client"

import type React from "react"
import { useState } from "react"
import { auth, db } from "../services/firebase"
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { Search, AlertCircle, CheckCircle, Loader2, CreditCard } from "lucide-react"
import { generateActionCode } from "../utils/generators"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface UserData {
  email?: string
  fullName?: string
  username?: string
  isBooker?: boolean
  phoneNumber?: string
  accountName?: string
  accountNumber?: string
  bankName?: string
}

interface EventData {
  id: string
  eventName: string
  eventDate: string
  payId: string
  ticketsSold: number
  totalRevenue: number
  userId: string
  userName: string
  userEmail?: string
  userPhone?: string
  userAccountName?: string
  userAccountNumber?: string
  userBankName?: string
  ticketPrices?: { policy: string; price: number }[]
  isFree?: boolean
  availableRevenue?: number
  totalPaidOut?: number
  allowAgents?: boolean
}

interface PayoutData {
  id: string
  payoutAmount: number
  payableAmount: number
  platformFee: number
  actionCode: string
  status: string
  createdAt: any
  agentId: string
  agentName: string
}

interface TicketSale {
  date: string
  count: number
  amount: number
  sales: {
    name: string
    email: string
    ticketType: string
    amount: number
  }[]
}

interface AttendeeData {
  id: string
  fullName: string
  email: string
  ticketType: string
  purchaseDate: string
  finalPrice: number
  verified?: boolean
}

interface CreatePayoutsTabProps {
  setMessage: (message: { text: string; type: string }) => void
  setLoading: (loading: boolean) => void
}

// Helper function to safely format timestamps
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return "Unknown"

  // If it's a Firestore timestamp (has seconds property)
  if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleString()
  }

  // If it's already a Date object or string
  try {
    return new Date(timestamp).toLocaleString()
  } catch (e) {
    return "Invalid date"
  }
}

const CreatePayoutsTab: React.FC<CreatePayoutsTabProps> = ({ setMessage, setLoading }) => {
  const [eventId, setEventId] = useState("")
  const [payId, setPayId] = useState("")
  const [bvt, setBvt] = useState("")
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [searchingEvent, setSearchingEvent] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState("")
  const [payableAmount, setPayableAmount] = useState("")
  const [platformFee, setPlatformFee] = useState("")
  const [actionCode, setActionCode] = useState("")
  const [payouts, setPayouts] = useState<PayoutData[]>([])
  const [ticketSales, setTicketSales] = useState<TicketSale[]>([])
  const [actionCodeSent, setActionCodeSent] = useState(false)
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null)
  const [attendeesData, setAttendeesData] = useState<AttendeeData[]>([])

  // Track available balance and total paid out
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [totalPaidOut, setTotalPaidOut] = useState<number>(0)

  const searchEvent = async () => {
    if (!eventId.trim() || !payId.trim() || !bvt.trim()) {
      setMessage({ text: "Please enter all required fields", type: "error" })
      return
    }

    setSearchingEvent(true)
    setEventData(null)
    setPayouts([])
    setTicketSales([])
    setAttendeesData([])

    try {
      // First, find the user with this BVT
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("bvt", "==", bvt.trim()))
      const userSnapshot = await getDocs(q)

      if (userSnapshot.empty) {
        setMessage({ text: "No user found with this BVT", type: "error" })
        setSearchingEvent(false)
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data() as UserData
      const userId = userDoc.id

      // Now search for the event
      const eventDocRef = doc(db, "events", userId, "userEvents", eventId.trim())
      const eventDoc = await getDoc(eventDocRef)

      if (!eventDoc.exists()) {
        setMessage({ text: "Event not found", type: "error" })
        setSearchingEvent(false)
        return
      }

      const eventData = eventDoc.data()

      // Verify payId matches
      if (eventData.payId !== payId.trim()) {
        setMessage({ text: "Pay ID does not match for this event", type: "error" })
        setSearchingEvent(false)
        return
      }

      // Get payouts for this event
      const payoutsRef = collection(db, "events", userId, "userEvents", eventId.trim(), "payouts")
      const payoutsQuery = query(payoutsRef, orderBy("createdAt", "desc"))
      const payoutsSnapshot = await getDocs(payoutsQuery)

      const payoutsList: PayoutData[] = []
      let calculatedTotalPaidOut = 0

      payoutsSnapshot.forEach((doc) => {
        const data = doc.data()
        // Only count completed payouts towards total paid out
        if (data.status === "completed") {
          calculatedTotalPaidOut += Number(data.payoutAmount || 0)
        }

        payoutsList.push({
          id: doc.id,
          payoutAmount: data.payoutAmount || 0,
          payableAmount: data.payableAmount || 0,
          platformFee: data.platformFee || 0,
          actionCode: data.actionCode || "",
          status: data.status || "pending",
          createdAt: data.createdAt,
          agentId: data.agentId || "",
          agentName: data.agentName || "",
        })
      })

      // Calculate available balance
      const totalRevenue = eventData.totalRevenue || 0

      // Use stored values if available, otherwise calculate
      const storedTotalPaidOut = eventData.totalPaidOut !== undefined ? eventData.totalPaidOut : calculatedTotalPaidOut
      const storedAvailableRevenue =
        eventData.availableRevenue !== undefined ? eventData.availableRevenue : totalRevenue - calculatedTotalPaidOut

      setTotalPaidOut(storedTotalPaidOut)
      setAvailableBalance(storedAvailableRevenue)

      // Get attendees (ticket sales) for this event
      const attendeesRef = collection(db, "events", userId, "userEvents", eventId.trim(), "attendees")
      const attendeesSnapshot = await getDocs(attendeesRef)

      const attendeesList: AttendeeData[] = []
      attendeesSnapshot.forEach((doc) => {
        const data = doc.data()
        attendeesList.push({
          id: doc.id,
          fullName: data.fullName || "Unknown",
          email: data.email || "No email",
          ticketType: data.ticketType || "Standard",
          purchaseDate: data.purchaseDate || "Unknown",
          finalPrice: data.finalPrice || data.ticketPrice || 0,
          // Check for 'verified' field instead of 'isVerified'
          // If verified field is absent or false, treat as not verified
          verified: data.verified === true,
        })
      })

      setAttendeesData(attendeesList)

      // Group ticket sales by date
      const salesByDate: { [key: string]: TicketSale } = {}
      attendeesList.forEach((attendee) => {
        const date = attendee.purchaseDate || "Unknown"
        if (!salesByDate[date]) {
          salesByDate[date] = {
            date,
            count: 0,
            amount: 0,
            sales: [],
          }
        }

        salesByDate[date].count += 1
        salesByDate[date].amount += Number(attendee.finalPrice || 0)
        salesByDate[date].sales.push({
          name: attendee.fullName,
          email: attendee.email,
          ticketType: attendee.ticketType,
          amount: attendee.finalPrice || 0,
        })
      })

      const salesList = Object.values(salesByDate)

      // Set state with all the data including booker account information
      setEventData({
        id: eventDoc.id,
        eventName: eventData.eventName || "Unknown Event",
        eventDate: eventData.eventDate || "Unknown Date",
        payId: eventData.payId || "",
        ticketsSold: eventData.ticketsSold || 0,
        userId,
        userName: userData.fullName || userData.username || "Unknown",
        // Add booker account information from userData
        userEmail: userData.email || "No email",
        userPhone: userData.phoneNumber || "Not provided",
        userAccountName: userData.accountName || "Not provided",
        userAccountNumber: userData.accountNumber || "Not provided",
        userBankName: userData.bankName || "Not provided",
        // Add ticket prices from the event data
        ticketPrices: eventData.ticketPrices || [],
        isFree: eventData.isFree || false,
        // Add financial tracking fields
        totalRevenue: eventData.totalRevenue || 0,
        availableRevenue: storedAvailableRevenue,
        totalPaidOut: storedTotalPaidOut,
        allowAgents: eventData.allowAgents || false,
      })
      setPayouts(payoutsList)
      setTicketSales(salesList)
    } catch (error) {
      console.error("Error searching for event:", error)
      setMessage({ text: "Error searching for event", type: "error" })
    } finally {
      setSearchingEvent(false)
    }
  }

  const calculatePayableAmount = () => {
    if (!payoutAmount.trim() || isNaN(Number(payoutAmount))) {
      setMessage({ text: "Please enter a valid payout amount", type: "error" })
      return
    }

    const amount = Number(payoutAmount)

    if (!eventData) {
      setMessage({ text: "No event data available", type: "error" })
      return
    }

    // Use the stored available balance
    if (amount > availableBalance) {
      setMessage({ text: "Payout amount exceeds available balance", type: "error" })
      return
    }

    // Calculate platform fee based on new policy
    // Base fee: 5% + ₦100
    // If agent activity enabled: 5% + ₦300
    const percentageFee = amount * 0.05
    const baseFee = eventData.allowAgents ? 300 : 100
    const totalPlatformFee = percentageFee + baseFee

    // Calculate payable amount (payout amount minus platform fee)
    const payable = amount - totalPlatformFee

    if (payable <= 0) {
      setMessage({ text: "Payout amount is too low to cover platform fees", type: "error" })
      return
    }

    setPayableAmount(payable.toFixed(2))
    setPlatformFee(totalPlatformFee.toFixed(2))
  }

  const sendActionCode = async () => {
    if (!payoutAmount.trim() || !payableAmount.trim() || !eventData) {
      setMessage({ text: "Please calculate payable amount first", type: "error" })
      return
    }

    setLoading(true)

    try {
      // Generate action code
      const code = generateActionCode()

      // Generate a payment reference (6 character alphanumeric)
      const generateReference = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        let result = ""
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
      }

      const paymentRef = generateReference()

      // Create payout document
      const payoutRef = collection(db, "events", eventData.userId, "userEvents", eventData.id, "payouts")
      await addDoc(payoutRef, {
        payoutAmount: Number(payoutAmount),
        payableAmount: Number(payableAmount),
        platformFee: Number(platformFee),
        actionCode: code,
        reference: paymentRef,
        status: "pending",
        createdAt: serverTimestamp(),
        agentId: auth.currentUser?.uid || "Unknown",
        agentName: auth.currentUser?.displayName || "Unknown Admin",
        transactionTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })

      setActionCodeSent(true)
      setMessage({ text: "Action code generated and sent to booker successfully", type: "success" })

      // Refresh payouts
      const payoutsRef = collection(db, "events", eventData.userId, "userEvents", eventData.id, "payouts")
      const payoutsQuery = query(payoutsRef, orderBy("createdAt", "desc"))
      const payoutsSnapshot = await getDocs(payoutsQuery)

      const payoutsList: PayoutData[] = []
      payoutsSnapshot.forEach((doc) => {
        const data = doc.data()
        payoutsList.push({
          id: doc.id,
          payoutAmount: data.payoutAmount || 0,
          payableAmount: data.payableAmount || 0,
          platformFee: data.platformFee || 0,
          actionCode: data.actionCode || "",
          status: data.status || "pending",
          createdAt: data.createdAt,
          agentId: data.agentId || "",
          agentName: data.agentName || "",
        })
      })

      setPayouts(payoutsList)

      // Reset payout amount and payable amount
      setPayoutAmount("")
      setPayableAmount("")
      setPlatformFee("")
    } catch (error) {
      console.error("Error generating action code:", error)
      setMessage({ text: "Failed to generate action code", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const verifyActionCode = async (payoutId: string, actionCode: string) => {
    if (!eventData) {
      setMessage({ text: "No event data available", type: "error" })
      return
    }

    setLoading(true)

    try {
      // Get the payout document
      const payoutDocRef = doc(db, "events", eventData.userId, "userEvents", eventData.id, "payouts", payoutId)
      const payoutDoc = await getDoc(payoutDocRef)

      if (!payoutDoc.exists()) {
        setMessage({ text: "Payout not found", type: "error" })
        setLoading(false)
        return
      }

      const payoutData = payoutDoc.data()

      // Verify the action code
      if (payoutData.actionCode !== actionCode) {
        setMessage({ text: "Invalid action code. Please check and try again.", type: "error" })
        setLoading(false)
        return
      }

      const payoutAmount = Number(payoutData.payoutAmount || 0)

      // Calculate new financial values
      const newTotalPaidOut = totalPaidOut + payoutAmount
      const newAvailableBalance = availableBalance - payoutAmount

      // Update payout status
      await updateDoc(payoutDocRef, {
        status: "completed",
        completedAt: serverTimestamp(),
        completedBy: auth.currentUser?.uid || "Unknown",
      })

      // Update event document with new financial data
      const eventDocRef = doc(db, "events", eventData.userId, "userEvents", eventData.id)
      await updateDoc(eventDocRef, {
        availableRevenue: newAvailableBalance,
        totalPaidOut: newTotalPaidOut,
        lastPayoutDate: serverTimestamp(),
        lastPayoutAmount: payoutAmount,
      })

      // Update local state
      setTotalPaidOut(newTotalPaidOut)
      setAvailableBalance(newAvailableBalance)

      setMessage({ text: "Payout processed successfully", type: "success" })

      // Refresh payouts
      const payoutsRef = collection(db, "events", eventData.userId, "userEvents", eventData.id, "payouts")
      const payoutsQuery = query(payoutsRef, orderBy("createdAt", "desc"))
      const payoutsSnapshot = await getDocs(payoutsQuery)

      const payoutsList: PayoutData[] = []
      payoutsSnapshot.forEach((doc) => {
        const data = doc.data()
        payoutsList.push({
          id: doc.id,
          payoutAmount: data.payoutAmount || 0,
          payableAmount: data.payableAmount || 0,
          platformFee: data.platformFee || 0,
          actionCode: data.actionCode || "",
          status: data.status || (data.status === "completed" ? "completed" : "pending"),
          createdAt: data.createdAt,
          agentId: data.agentId || "",
          agentName: data.agentName || "",
        })
      })

      setPayouts(payoutsList)

      // Reset action code input
      setActionCode("")
      setSelectedPayoutId(null)
    } catch (error) {
      console.error("Error processing payout:", error)
      setMessage({ text: "Failed to process payout", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Calculate verification statistics - Updated to use 'verified' field
  const getVerificationStats = () => {
    if (attendeesData.length === 0) {
      return { verified: 0, notVerified: 0, percentage: 0 }
    }

    // Count tickets where verified === true
    const verified = attendeesData.filter((attendee) => attendee.verified === true).length
    const notVerified = attendeesData.length - verified
    const percentage = (verified / attendeesData.length) * 100

    return { verified, notVerified, percentage }
  }

  const verificationStats = getVerificationStats()

  // Data for pie chart
  const pieData = [
    { name: "Verified", value: verificationStats.verified, color: "#28a745" },
    { name: "Not Verified", value: verificationStats.notVerified, color: "#dc3545" },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="verification-tooltip">
          <p>{`${data.name}: ${data.value} tickets`}</p>
          <p>{`${((data.value / attendeesData.length) * 100).toFixed(1)}%`}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="admin-section">
      <h2>Create Payout</h2>

      <div className="payout-search">
        <h3>Search Event</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Event ID</label>
            <input
              type="text"
              placeholder="Enter Event ID"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Pay ID</label>
            <input type="text" placeholder="Enter Pay ID" value={payId} onChange={(e) => setPayId(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Booker Verification Tag (BVT)</label>
            <input type="text" placeholder="Enter BVT" value={bvt} onChange={(e) => setBvt(e.target.value)} />
          </div>
          <div className="form-group">
            <button
              className="search-event-btn"
              onClick={searchEvent}
              disabled={searchingEvent || !eventId.trim() || !payId.trim() || !bvt.trim()}
            >
              {searchingEvent ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              Search
            </button>
          </div>
        </div>
      </div>

      {eventData && (
        <div className="event-details">
          <h3>Event Details</h3>
          <div className="event-card">
            <div className="event-header">
              <h4>{eventData.eventName}</h4>
              <p className="event-date">{formatTimestamp(eventData.eventDate)}</p>
            </div>

            <div className="event-stats">
              <div className="stat-item">
                <span>Booker:</span>
                <span>{eventData.userName}</span>
              </div>
              <div className="stat-item">
                <span>Tickets Sold:</span>
                <span>{eventData.ticketsSold || 0}</span>
              </div>
              <div className="stat-item">
                <span>Total Revenue:</span>
                <span>₦{(eventData.totalRevenue || 0).toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span>Total Paid Out:</span>
                <span>₦{totalPaidOut.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span>Available Revenue:</span>
                <span>₦{availableBalance.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span>Agent Activity:</span>
                <span className={eventData.allowAgents ? "agent-enabled" : "agent-disabled"}>
                  {eventData.allowAgents ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            {/* Booker Account Data Section */}
            <div className="booker-account-section">
              <h4>
                <CreditCard size={20} />
                Booker Account Data
              </h4>
              <p className="account-info-subtitle">Payment will be sent to the following account:</p>
              <div className="account-details">
                <div className="account-field">
                  <span className="field-label">Account Holder:</span>
                  <span className="field-value">{eventData.userName}</span>
                </div>
                <div className="account-field">
                  <span className="field-label">Email:</span>
                  <span className="field-value">{eventData.userEmail}</span>
                </div>
                <div className="account-field">
                  <span className="field-label">Phone Number:</span>
                  <span className="field-value">{eventData.userPhone}</span>
                </div>
                <div className="account-field">
                  <span className="field-label">Account Name:</span>
                  <span className="field-value account-name">{eventData.userAccountName}</span>
                </div>
                <div className="account-field">
                  <span className="field-label">Account Number:</span>
                  <span className="field-value account-number">{eventData.userAccountNumber}</span>
                </div>
                <div className="account-field">
                  <span className="field-label">Bank Name:</span>
                  <span className="field-value bank-name">{eventData.userBankName}</span>
                </div>
              </div>
              {(eventData.userAccountName === "Not provided" ||
                eventData.userAccountNumber === "Not provided" ||
                eventData.userBankName === "Not provided") && (
                <div className="account-warning">
                  <AlertCircle size={16} />
                  <span>Incomplete account information. Please ensure booker has provided all banking details.</span>
                </div>
              )}
            </div>

            {/* Ticket Verification Chart */}
            {attendeesData.length > 0 && (
              <div className="verification-section">
                <h4>Ticket Verification Status</h4>
                <div className="verification-content">
                  <div className="verification-chart">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="verification-stats">
                    <div className="verification-stat">
                      <span className="stat-label">Verified Tickets:</span>
                      <span className="stat-value verified">{verificationStats.verified}</span>
                    </div>
                    <div className="verification-stat">
                      <span className="stat-label">Not Verified:</span>
                      <span className="stat-value not-verified">{verificationStats.notVerified}</span>
                    </div>
                    <div className="verification-stat">
                      <span className="stat-label">Verification Rate:</span>
                      <span className="stat-value">{verificationStats.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  {verificationStats.percentage < 70 && (
                    <div className="verification-warning">
                      <AlertCircle size={20} />
                      <span>Not enough verified tickets to prove authenticity</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="create-payout">
              <h4>Create New Payout</h4>
              <div className="payout-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Payout Amount (₦)</label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      disabled={actionCodeSent}
                    />
                  </div>
                  <div className="form-group">
                    <button
                      className="calculate-btn"
                      onClick={calculatePayableAmount}
                      disabled={!payoutAmount.trim() || isNaN(Number(payoutAmount)) || actionCodeSent}
                    >
                      Calculate
                    </button>
                  </div>
                </div>

                {platformFee && (
                  <div className="fee-breakdown">
                    <div className="fee-item">
                      <label>Platform Fee (₦)</label>
                      <input type="text" value={platformFee} readOnly />
                      <p className="fee-info">
                        {eventData.allowAgents ? "5% + ₦300 (Agent activity enabled)" : "5% + ₦100 (Standard fee)"}
                      </p>
                    </div>
                  </div>
                )}

                {payableAmount && (
                  <div className="payable-amount">
                    <label>Payable Amount (₦)</label>
                    <input type="text" value={payableAmount} readOnly />
                    <p className="fee-info">Amount booker will receive after platform fees</p>
                  </div>
                )}

                <div className="action-code-section">
                  {actionCodeSent ? (
                    <div className="action-code-display">
                      <h5>Action Code Sent to Booker</h5>
                      <p>
                        The action code has been generated and sent to the booker. Ask the booker to provide you with
                        the code to complete the payout process.
                      </p>
                      <div className="action-code-input">
                        <label>Enter Action Code from Booker</label>
                        <div className="code-input-row">
                          <input
                            type="text"
                            placeholder="Enter action code"
                            value={actionCode}
                            onChange={(e) => setActionCode(e.target.value)}
                          />
                          <button
                            className="verify-code-btn"
                            onClick={() => {
                              // Find the most recent pending payout
                              const pendingPayout = payouts.find((p) => p.status === "pending")
                              if (pendingPayout && pendingPayout.id) {
                                verifyActionCode(pendingPayout.id, actionCode)
                              } else {
                                setMessage({ text: "No pending payout found", type: "error" })
                              }
                            }}
                            disabled={!actionCode.trim()}
                          >
                            Verify & Process
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button className="send-code-btn" onClick={sendActionCode} disabled={!payableAmount}>
                      Generate Action Code
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="payouts-section">
              <h4>Payout History</h4>
              <div className="payouts-table-container">
                <table className="payouts-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="hidden md:table-cell">Payout Amount</th>
                      <th className="hidden md:table-cell">Platform Fee</th>
                      <th className="hidden md:table-cell">Payable Amount</th>
                      <th>Action Code</th>
                      <th className="hidden md:table-cell">Agent</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length > 0 ? (
                      payouts.map((payout) => (
                        <tr key={payout.id}>
                          <td>{formatTimestamp(payout.createdAt)}</td>
                          <td className="hidden md:table-cell">₦{Number(payout.payoutAmount).toFixed(2)}</td>
                          <td className="hidden md:table-cell">₦{Number(payout.platformFee || 0).toFixed(2)}</td>
                          <td className="hidden md:table-cell">₦{Number(payout.payableAmount).toFixed(2)}</td>
                          <td>{payout.actionCode}</td>
                          <td className="hidden md:table-cell">{payout.agentName || "Unknown"}</td>
                          <td>
                            <span className={`status ${payout.status}`}>
                              {payout.status === "completed" ? (
                                <>
                                  <CheckCircle size={14} />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <AlertCircle size={14} />
                                  Pending
                                </>
                              )}
                            </span>
                          </td>
                          <td>
                            {payout.status === "pending" && (
                              <button
                                className="verify-payout-btn"
                                onClick={() => {
                                  setSelectedPayoutId(payout.id)
                                  setActionCode("")
                                }}
                              >
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="no-data">
                          No payouts found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ticket-sales-section">
              <h4>Ticket Sales</h4>

              {/* Add ticket types section */}
              {eventData && (
                <div className="ticket-types-section">
                  <h5>Ticket Types</h5>
                  <div className="ticket-types-table-container">
                    <table className="ticket-types-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventData.isFree ? (
                          <tr>
                            <td>Free Admission</td>
                            <td>₦0.00</td>
                          </tr>
                        ) : (
                          eventData.ticketPrices &&
                          eventData.ticketPrices.map((ticket, index) => (
                            <tr key={index}>
                              <td>{ticket.policy}</td>
                              <td>₦{Number(ticket.price).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h5 className="sales-by-date">Sales by Date</h5>
              <div className="sales-accordion">
                {ticketSales.length > 0 ? (
                  ticketSales.map((day, index) => (
                    <div key={index} className="sales-day">
                      <div className="sales-day-header">
                        <div className="day-info">
                          <h5>
                            {typeof day.date === "object" && "seconds" in day.date
                              ? formatTimestamp(day.date)
                              : day.date}
                          </h5>
                          <span>{day.count} tickets</span>
                        </div>
                        <div className="day-total">₦{day.amount.toFixed(2)}</div>
                      </div>
                      <div className="sales-day-details">
                        <table className="sales-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Ticket Type</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {day.sales.map((sale, saleIndex) => (
                              <tr key={saleIndex}>
                                <td>{sale.name}</td>
                                <td>{sale.email}</td>
                                <td>{sale.ticketType}</td>
                                <td>₦{Number(sale.amount).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No ticket sales found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreatePayoutsTab
