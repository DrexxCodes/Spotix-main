"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, query, orderBy } from "firebase/firestore"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "../booker-ticket-info-override.css"
import { Copy, Check, AlertCircle, Shield, Eye, EyeOff, Wallet, ArrowUpRight } from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import "../booker-ticket-info-override.css"


// Add this utility function at the top of the file, after the imports
const formatFirestoreTimestamp = (timestamp: any): string => {
  if (!timestamp) return "Unknown"

  // Check if it's a Firestore timestamp (has seconds and nanoseconds)
  if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
    try {
      // Convert Firestore timestamp to JavaScript Date
      const date = new Date(timestamp.seconds * 1000)
      return date.toLocaleDateString()
    } catch (error) {
      console.error("Error formatting timestamp:", error)
      return "Invalid date"
    }
  }

  // If it's already a string, just return it
  return String(timestamp)
}

interface EventData {
  id: string
  eventName: string
  eventImage: string
  eventDate: string
  eventType: string
  eventDescription: string
  isFree: boolean
  ticketPrices: { policy: string; price: number }[]
  createdBy: string
  eventVenue: string
  totalCapacity: number
  ticketsSold: number
  totalRevenue: number
  eventEndDate: string
  eventStart: string
  eventEnd: string
  enableMaxSize: boolean
  maxSize: string
  enableColorCode: boolean
  colorCode: string
  enableStopDate: boolean
  stopDate: string
  payId?: string
  availableRevenue?: number
  totalPaidOut?: number
}

interface AttendeeData {
  id: string
  fullName: string
  email: string
  ticketType: string
  verified: boolean
  purchaseDate: string
  purchaseTime: string
  ticketReference: string
}

// Add agentName to the PayoutData interface
interface PayoutData {
  id?: string
  date: string
  amount: number
  status: string
  actionCode?: string
  reference?: string
  createdAt?: any
  payoutAmount?: number
  payableAmount?: number
  agentName?: string
  transactionTime?: string
}

interface TicketSalesByDay {
  date: string
  count: number
}

interface TicketSalesByType {
  type: string
  count: number
}

interface DiscountData {
  code: string
  type: "percentage" | "flat"
  value: number
  maxUses: number
  usedCount: number
  active: boolean
}

const BookerTicketInfo = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [attendees, setAttendees] = useState<AttendeeData[]>([])
  const [payouts, setPayouts] = useState<PayoutData[]>([])
  const [activeTab, setActiveTab] = useState<"overview" | "attendees" | "payouts" | "edit" | "discounts">("overview")
  const [ticketSalesByDay, setTicketSalesByDay] = useState<TicketSalesByDay[]>([])
  const [ticketSalesByType, setTicketSalesByType] = useState<TicketSalesByType[]>([])
  const [editFormData, setEditFormData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [discounts, setDiscounts] = useState<DiscountData[]>([])
  const [newDiscount, setNewDiscount] = useState<DiscountData>({
    code: "",
    type: "percentage",
    value: 0,
    maxUses: 1,
    usedCount: 0,
    active: true,
  })
  const [actionCode, setActionCode] = useState<string>("")
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [bookerBVT, setBookerBVT] = useState<string>("")
  const [visibleActionCodes, setVisibleActionCodes] = useState<Record<string, boolean>>({})

  // Add new state variables after the existing state declarations
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [totalPaidOut, setTotalPaidOut] = useState<number>(0)

  // Ticket sales by type data for chart
  const ticketTypeData = useMemo(() => {
    if (!eventData || !attendees.length) return []

    const typeCount: Record<string, number> = {}
    attendees.forEach((attendee) => {
      typeCount[attendee.ticketType] = (typeCount[attendee.ticketType] || 0) + 1
    })

    return Object.keys(typeCount).map((type) => ({
      type,
      count: typeCount[type],
    }))
  }, [eventData, attendees])

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        if (!id) return
        const user = auth.currentUser
        if (!user) return

        // Get user data to retrieve BVT
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.bvt) {
            setBookerBVT(userData.bvt)
          }
        }

        // Get event from the user's events collection
        const eventDocRef = doc(db, "events", user.uid, "userEvents", id)
        const eventDoc = await getDoc(eventDocRef)

        if (eventDoc.exists()) {
          const data = eventDoc.data()
          const eventDataObj = {
            id: eventDoc.id,
            eventName: data.eventName || "",
            eventImage: data.eventImage || "/placeholder.svg",
            eventDate: data.eventDate || new Date().toISOString(),
            eventType: data.eventType || "",
            eventDescription: data.eventDescription || "",
            isFree: data.isFree || false,
            ticketPrices: data.ticketPrices || [],
            createdBy: data.createdBy || user.uid,
            eventVenue: data.eventVenue || "",
            totalCapacity: data.enableMaxSize ? Number.parseInt(data.maxSize) : 100,
            ticketsSold: data.ticketsSold || 0,
            totalRevenue: data.totalRevenue || 0,
            eventEndDate: data.eventEndDate || "",
            eventStart: data.eventStart || "",
            eventEnd: data.eventEnd || "",
            enableMaxSize: data.enableMaxSize || false,
            maxSize: data.maxSize || "",
            enableColorCode: data.enableColorCode || false,
            colorCode: data.colorCode || "",
            enableStopDate: data.enableStopDate || false,
            stopDate: data.stopDate || "",
            payId: data.payId || "",
            // Add these fields to capture financial data from Firestore
            availableRevenue: data.availableRevenue,
            totalPaidOut: data.totalPaidOut,
          }

          setEventData(eventDataObj)
          // Initialize edit form data with the correct pricing state
          setEditFormData({
            ...eventDataObj,
            enablePricing: !data.isFree,
          })

          // Fetch attendees
          try {
            const attendeesCollectionRef = collection(db, "events", user.uid, "userEvents", id, "attendees")
            const attendeesSnapshot = await getDocs(attendeesCollectionRef)

            if (!attendeesSnapshot.empty) {
              const attendeesList: AttendeeData[] = []
              attendeesSnapshot.forEach((doc) => {
                const attendeeData = doc.data()
                attendeesList.push({
                  id: doc.id,
                  fullName: attendeeData.fullName || "Unknown",
                  email: attendeeData.email || "no-email@example.com",
                  ticketType: attendeeData.ticketType || "Standard",
                  verified: attendeeData.verified || false,
                  purchaseDate: formatFirestoreTimestamp(attendeeData.purchaseDate),
                  purchaseTime: attendeeData.purchaseTime || "Unknown",
                  ticketReference: attendeeData.ticketReference || "Unknown",
                })
              })
              setAttendees(attendeesList)

              // Process ticket sales by day
              const salesByDay: Record<string, number> = {}
              attendeesList.forEach((attendee) => {
                if (attendee.purchaseDate && attendee.purchaseDate !== "Unknown") {
                  salesByDay[attendee.purchaseDate] = (salesByDay[attendee.purchaseDate] || 0) + 1
                }
              })

              const salesByDayArray = Object.keys(salesByDay).map((date) => ({
                date,
                count: salesByDay[date],
              }))

              // Sort by date
              salesByDayArray.sort((a, b) => {
                const dateA = new Date(a.date).getTime()
                const dateB = new Date(b.date).getTime()
                return dateA - dateB
              })

              setTicketSalesByDay(salesByDayArray)

              // Process ticket sales by type
              const salesByType: Record<string, number> = {}
              attendeesList.forEach((attendee) => {
                salesByType[attendee.ticketType] = (salesByType[attendee.ticketType] || 0) + 1
              })

              const salesByTypeArray = Object.keys(salesByType).map((type) => ({
                type,
                count: salesByType[type],
              }))

              setTicketSalesByType(salesByTypeArray)
            } else {
              setAttendees([])
              setTicketSalesByDay([])
              setTicketSalesByType([])
            }
          } catch (error) {
            console.error("Error fetching attendees:", error)
            setAttendees([])
            setTicketSalesByDay([])
            setTicketSalesByType([])
          }

          // Fetch discounts
          try {
            const discountsCollectionRef = collection(db, "events", user.uid, "userEvents", id, "discounts")
            const discountsSnapshot = await getDocs(discountsCollectionRef)

            if (!discountsSnapshot.empty) {
              const discountsList: DiscountData[] = []
              discountsSnapshot.forEach((doc) => {
                const discountData = doc.data() as DiscountData
                discountsList.push({
                  ...discountData,
                  code: discountData.code || "",
                  type: discountData.type || "percentage",
                  value: discountData.value || 0,
                  maxUses: discountData.maxUses || 1,
                  usedCount: discountData.usedCount || 0,
                  active: discountData.active !== false, // Default to true if not specified
                })
              })
              setDiscounts(discountsList)
            } else {
              setDiscounts([])
            }
          } catch (error) {
            console.error("Error fetching discounts:", error)
            setDiscounts([])
          }

          // Fetch payouts from the payouts collection
          try {
            const payoutsCollectionRef = collection(db, "events", user.uid, "userEvents", id, "payouts")
            const payoutsQuery = query(payoutsCollectionRef, orderBy("createdAt", "desc"))
            const payoutsSnapshot = await getDocs(payoutsQuery)

            if (!payoutsSnapshot.empty) {
              const payoutsList: PayoutData[] = []
              let calculatedTotalPaidOut = 0

              payoutsSnapshot.forEach((doc) => {
                const payoutData = doc.data()
                const payoutAmount = payoutData.payoutAmount || 0

                // Only count confirmed payouts towards total paid out
                if (payoutData.status === "Confirmed") {
                  calculatedTotalPaidOut += payoutAmount
                }

                payoutsList.push({
                  id: doc.id,
                  date: formatFirestoreTimestamp(payoutData.createdAt) || new Date().toLocaleDateString(),
                  amount: payoutAmount,
                  status: payoutData.status || "Pending",
                  actionCode: payoutData.actionCode || "",
                  reference: payoutData.reference || "",
                  createdAt: payoutData.createdAt,
                  payoutAmount: payoutAmount,
                  payableAmount: payoutData.payableAmount || 0,
                  agentName: payoutData.agentName || "",
                  transactionTime: payoutData.transactionTime || formatTransactionTime(payoutData.createdAt) || "",
                })
              })

              setPayouts(payoutsList)

              // Use the stored values from Firestore if available, otherwise calculate
              if (eventDataObj.totalPaidOut !== undefined) {
                setTotalPaidOut(eventDataObj.totalPaidOut)
              } else {
                setTotalPaidOut(calculatedTotalPaidOut)
              }

              // Set available balance based on Firestore field or calculate it
              if (eventDataObj.availableRevenue !== undefined) {
                setAvailableBalance(eventDataObj.availableRevenue)
              } else {
                const totalRevenue = eventDataObj.totalRevenue || 0
                const calculatedAvailableBalance = totalRevenue - calculatedTotalPaidOut
                setAvailableBalance(calculatedAvailableBalance)
              }
            } else {
              setPayouts([])
              setTotalPaidOut(0)

              // If no payouts, still use Firestore value if available
              if (eventDataObj.availableRevenue !== undefined) {
                setAvailableBalance(eventDataObj.availableRevenue)
              } else {
                setAvailableBalance(eventDataObj.totalRevenue || 0)
              }
            }
          } catch (error) {
            console.error("Error fetching payouts:", error)
            setPayouts([])
            setTotalPaidOut(eventDataObj.totalPaidOut || 0)
            setAvailableBalance(eventDataObj.availableRevenue || eventDataObj.totalRevenue || 0)
          }
        } else {
          console.error("Event not found")
          navigate("/booker-tickets")
        }
      } catch (error) {
        console.error("Error fetching event data:", error)
        setError("Failed to load event data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchEventData()
  }, [id, navigate])

  const handleVerifyTicket = () => {
    navigate("/verifyticket", { state: { eventId: id, eventName: eventData?.eventName } })
  }

  const handleEditEvent = () => {
    setActiveTab("edit")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setEditFormData({
        ...editFormData,
        [name]: checked,
      })
    } else {
      setEditFormData({
        ...editFormData,
        [name]: value,
      })
    }
  }

  const handleTicketPriceChange = (index: number, field: "policy" | "price", value: string) => {
    const updatedPrices = [...editFormData.ticketPrices]
    updatedPrices[index][field] = field === "price" ? Number(value) : value
    setEditFormData({
      ...editFormData,
      ticketPrices: updatedPrices,
    })
  }

  const addTicketPrice = () => {
    setEditFormData({
      ...editFormData,
      ticketPrices: [...editFormData.ticketPrices, { policy: "", price: 0 }],
    })
  }

  const handleDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === "number") {
      setNewDiscount({
        ...newDiscount,
        [name]: Number(value),
      })
    } else {
      setNewDiscount({
        ...newDiscount,
        [name]: value,
      })
    }
  }

  const handleAddDiscount = async () => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user || !id) throw new Error("User not authenticated or event ID missing")

      // Check if discount code already exists
      const codeExists = discounts.some((discount) => discount.code.toLowerCase() === newDiscount.code.toLowerCase())

      if (codeExists) {
        alert("This discount code already exists. Please use a different code.")
        setLoading(false)
        return
      }

      // Add discount to Firestore
      const discountsCollectionRef = collection(db, "events", user.uid, "userEvents", id, "discounts")
      await addDoc(discountsCollectionRef, newDiscount)

      // Update local state
      setDiscounts([...discounts, newDiscount])

      // Reset form
      setNewDiscount({
        code: "",
        type: "percentage",
        value: 0,
        maxUses: 1,
        usedCount: 0,
        active: true,
      })

      alert("Discount code added successfully!")
    } catch (error) {
      console.error("Error adding discount:", error)
      alert("Failed to add discount code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDiscountStatus = async (index: number) => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user || !id) throw new Error("User not authenticated or event ID missing")

      // Get the discount to update
      const discountToUpdate = discounts[index]

      // Update in Firestore
      // Note: In a real app, you would need to store the document ID to update it directly
      // For this example, we'll recreate the discount with the updated status
      const discountsCollectionRef = collection(db, "events", user.uid, "userEvents", id, "discounts")

      // Get all discounts to find the one to update
      const discountsSnapshot = await getDocs(discountsCollectionRef)
      let docIdToUpdate: string | null = null

      discountsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.code === discountToUpdate.code) {
          docIdToUpdate = doc.id
        }
      })

      if (docIdToUpdate) {
        const discountDocRef = doc(db, "events", user.uid, "userEvents", id, "discounts", docIdToUpdate)
        await updateDoc(discountDocRef, {
          active: !discountToUpdate.active,
        })

        // Update local state
        const updatedDiscounts = [...discounts]
        updatedDiscounts[index] = {
          ...discountToUpdate,
          active: !discountToUpdate.active,
        }
        setDiscounts(updatedDiscounts)
      }
    } catch (error) {
      console.error("Error updating discount status:", error)
      alert("Failed to update discount status. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = auth.currentUser
      if (!user || !id) throw new Error("User not authenticated or event ID missing")

      // Prepare the update data with correct isFree value
      const updateData = {
        eventName: editFormData.eventName,
        eventDescription: editFormData.eventDescription,
        eventDate: editFormData.eventDate,
        eventEndDate: editFormData.eventEndDate,
        eventVenue: editFormData.eventVenue,
        eventStart: editFormData.eventStart,
        eventEnd: editFormData.eventEnd,
        eventType: editFormData.eventType,
        isFree: !editFormData.enablePricing, // This is the key fix
        ticketPrices: editFormData.enablePricing ? editFormData.ticketPrices : [],
        enableStopDate: editFormData.enableStopDate,
        stopDate: editFormData.enableStopDate ? editFormData.stopDate : null,
        enableColorCode: editFormData.enableColorCode,
        colorCode: editFormData.enableColorCode ? editFormData.colorCode : null,
        enableMaxSize: editFormData.enableMaxSize,
        maxSize: editFormData.enableMaxSize ? editFormData.maxSize : null,
      }

      // Update the event document
      const eventDocRef = doc(db, "events", user.uid, "userEvents", id)
      await updateDoc(eventDocRef, updateData)

      // Refresh event data
      const updatedEventDoc = await getDoc(eventDocRef)
      if (updatedEventDoc.exists()) {
        const data = updatedEventDoc.data()
        const updatedEventData = {
          ...eventData!,
          eventName: data.eventName || "",
          eventDescription: data.eventDescription || "",
          eventDate: data.eventDate || "",
          eventEndDate: data.eventEndDate || "",
          eventVenue: data.eventVenue || "",
          eventStart: data.eventStart || "",
          eventEnd: data.eventEnd || "",
          eventType: data.eventType || "",
          isFree: data.isFree || false,
          ticketPrices: data.ticketPrices || [],
          enableStopDate: data.enableStopDate || false,
          stopDate: data.stopDate || "",
          enableColorCode: data.enableColorCode || false,
          colorCode: data.colorCode || "",
          enableMaxSize: data.enableMaxSize || false,
          maxSize: data.maxSize || "",
        }

        setEventData(updatedEventData)
        // Update edit form data with the correct pricing state
        setEditFormData({
          ...updatedEventData,
          enablePricing: !data.isFree,
        })
      }

      // Switch back to overview tab
      setActiveTab("overview")
      alert("Event updated successfully!")
    } catch (error) {
      console.error("Error updating event:", error)
      alert("Failed to update event. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayout = async (payoutId: string) => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user || !id) throw new Error("User not authenticated or event ID missing")

      // Find the payout
      const payout = payouts.find((p) => p.id === payoutId)
      if (!payout) {
        throw new Error("Payout not found")
      }

      // Verify action code
      if (!actionCode) {
        alert("Please enter the action code")
        setLoading(false)
        return
      }

      if (actionCode !== payout.actionCode) {
        alert("Invalid action code. Please check and try again.")
        setLoading(false)
        return
      }

      // Update payout status in Firestore
      const payoutDocRef = doc(db, "events", user.uid, "userEvents", id, "payouts", payoutId)
      await updateDoc(payoutDocRef, {
        status: "Confirmed",
        confirmedAt: new Date(),
        confirmedBy: user.uid,
      })

      // Update local state
      const updatedPayouts = payouts.map((p) => {
        if (p.id === payoutId) {
          return { ...p, status: "Confirmed" }
        }
        return p
      })
      setPayouts(updatedPayouts)

      // Reset action code and selected payout
      setActionCode("")
      setSelectedPayoutId(null)

      alert("Payout confirmed successfully!")
    } catch (error) {
      console.error("Error confirming payout:", error)
      alert("Failed to confirm payout. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
      },
      (err) => {
        console.error("Could not copy text: ", err)
      },
    )
  }

  const toggleActionCodeVisibility = (payoutId: string) => {
    setVisibleActionCodes((prev) => ({
      ...prev,
      [payoutId]: !prev[payoutId],
    }))
  }

  // Add this function after the toggleActionCodeVisibility function
  const formatTransactionTime = (timestamp: any): string => {
    if (!timestamp) return "Unknown"

    // Check if it's a Firestore timestamp
    if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
      try {
        // Convert Firestore timestamp to JavaScript Date with time
        const date = new Date(timestamp.seconds * 1000)
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } catch (error) {
        console.error("Error formatting transaction time:", error)
        return "Invalid time"
      }
    }

    return String(timestamp)
  }

  if (loading) {
    return <Preloader />
  }

  if (!eventData) {
    return (
      <>
        <BookersHeader />
        <div className="error-container">
          <h2>Event not found</h2>
          <button onClick={() => navigate("/booker-tickets")}>Back to My Events</button>
        </div>
        <Footer />
      </>
    )
  }

  // Safely render the attendees tab with error handling
  const renderAttendeesTab = () => {
    try {
      return (
        <div className="attendees-tab">
          <h3>Attendees List</h3>
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
                {attendees.length > 0 ? (
                  attendees.map((attendee) => (
                    <tr key={attendee.id}>
                      <td className="reference-cell">{attendee.ticketReference}</td>
                      <td>{attendee.fullName}</td>
                      <td className="email-cell">{attendee.email}</td>
                      <td>{attendee.ticketType}</td>
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
                      No attendees yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    } catch (error) {
      console.error("Error rendering attendees tab:", error)
      return (
        <div className="error-message">
          <h3>Error Loading Attendees</h3>
          <p>There was a problem loading the attendees data. Please try again later.</p>
        </div>
      )
    }
  }

  // Render the discounts tab
  const renderDiscountsTab = () => {
    return (
      <div className="discounts-tab">
        <h3>Discount Codes</h3>

        <div className="discount-form">
          <div className="form-section">
            <h4>Create New Discount</h4>
            <div className="form-group">
              <label>Discount Code</label>
              <input
                type="text"
                name="code"
                value={newDiscount.code}
                onChange={handleDiscountInputChange}
                placeholder="e.g. SUMMER20"
                required
              />
            </div>

            <div className="form-group">
              <label>Discount Type</label>
              <select name="type" value={newDiscount.type} onChange={handleDiscountInputChange}>
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₦)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Discount Value</label>
              <div className="discount-value-input">
                <input
                  type="number"
                  name="value"
                  value={newDiscount.value}
                  onChange={handleDiscountInputChange}
                  min="0"
                  max={newDiscount.type === "percentage" ? 100 : undefined}
                  required
                />
                <span className="discount-value-symbol">{newDiscount.type === "percentage" ? "%" : "₦"}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Maximum Uses</label>
              <input
                type="number"
                name="maxUses"
                value={newDiscount.maxUses}
                onChange={handleDiscountInputChange}
                min="1"
                required
              />
            </div>

            <button type="button" className="add-discount-button" onClick={handleAddDiscount}>
              Add Discount Code
            </button>
          </div>

          <div className="form-section">
            <h4>Active Discount Codes</h4>
            {discounts.length > 0 ? (
              <div className="discounts-table-container">
                <table className="discounts-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Uses</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map((discount, index) => (
                      <tr key={index}>
                        <td>{discount.code}</td>
                        <td>{discount.type === "percentage" ? "Percentage" : "Flat Amount"}</td>
                        <td>
                          {discount.value}
                          {discount.type === "percentage" ? "%" : "₦"}
                        </td>
                        <td>
                          {discount.usedCount} / {discount.maxUses}
                        </td>
                        <td>
                          <span className={`status-badge ${discount.active ? "status-verified" : "status-pending"}`}>
                            {discount.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`toggle-status-btn ${discount.active ? "deactivate" : "activate"}`}
                            onClick={() => handleToggleDiscountStatus(index)}
                          >
                            {discount.active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-discounts-message">No discount codes created yet.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render the payouts tab with real payout data and action codes
  const renderPayoutsTab = () => {
    return (
      <div className="payouts-tab">
        <h3>Payout History</h3>
        <div className="payouts-info-alert">
          <AlertCircle size={18} />
          <p>
            When an admin initiates a payout, you'll see an action code below. Share this code with the admin to
            complete the payout process.
          </p>
        </div>

        <div className="balance-summary">
          <div className="balance-card">
            <div className="balance-icon">
              <Wallet size={24} />
            </div>
            <div className="balance-details">
              <h4>Available Balance</h4>
              <p className="balance-amount">₦{availableBalance.toFixed(2)}</p>
              <span className="balance-label">Ready to withdraw</span>
            </div>
          </div>
          <div className="balance-card">
            <div className="balance-icon">
              <ArrowUpRight size={24} />
            </div>
            <div className="balance-details">
              <h4>Total Paid Out</h4>
              <p className="balance-amount">₦{totalPaidOut.toFixed(2)}</p>
              <span className="balance-label">Successfully processed</span>
            </div>
          </div>
        </div>

        <div className="payouts-table-container">
          <table className="payouts-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Agent</th>
                <th>Action Code</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length > 0 ? (
                payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td>{payout.date}</td>
                    <td>{payout.transactionTime || formatTransactionTime(payout.createdAt) || "N/A"}</td>
                    <td>{payout.reference || "N/A"}</td>
                    <td>₦{payout.payoutAmount ? payout.payoutAmount.toFixed(2) : payout.amount.toFixed(2)}</td>
                    <td>{payout.agentName || "Unknown"}</td>
                    <td className="action-code-cell">
                      {payout.actionCode ? (
                        <div className="action-code-container">
                          <span className={visibleActionCodes[payout.id || ""] ? "visible-code" : "hidden-code"}>
                            {visibleActionCodes[payout.id || ""] ? payout.actionCode : "••••••"}
                          </span>
                          <button
                            className="toggle-visibility-btn"
                            onClick={() => toggleActionCodeVisibility(payout.id || "")}
                            title={visibleActionCodes[payout.id || ""] ? "Hide code" : "Show code"}
                          >
                            {visibleActionCodes[payout.id || ""] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            className="copy-button"
                            onClick={() => copyToClipboard(payout.actionCode || "", `actionCode-${payout.id}`)}
                            title="Copy code"
                          >
                            {copiedField === `actionCode-${payout.id}` ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${payout.status.toLowerCase()}`}>{payout.status}</span>
                    </td>
                    <td>
                      {payout.status === "Pending" && payout.actionCode && (
                        <button className="confirm-payout-btn" onClick={() => setSelectedPayoutId(payout.id ?? null)}>
                          Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="no-payouts-message">
                    No payouts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action Code Confirmation Modal */}
        {selectedPayoutId && (
          <div className="action-code-modal">
            <div className="action-code-content">
              <h4>Confirm Payout</h4>
              <p>Enter the action code provided by the admin to confirm this payout.</p>
              <div className="form-group">
                <label>Action Code</label>
                <input
                  type="text"
                  value={actionCode}
                  onChange={(e) => setActionCode(e.target.value)}
                  placeholder="Enter action code"
                />
              </div>
              <div className="action-buttons">
                <button className="confirm-button" onClick={() => handleConfirmPayout(selectedPayoutId)}>
                  Confirm
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    setSelectedPayoutId(null)
                    setActionCode("")
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Information */}
        <div className="payout-security-info">
          <div className="security-header">
            <Shield size={18} />
            <h4>Payout Security Information</h4>
          </div>
          <div className="security-content">
            <p>For your security, we use action codes to verify payout requests. When an admin initiates a payout:</p>
            <ol>
              <li>You'll see an action code in the table above</li>
              <li>Share this code with the admin who initiated the payout</li>
              <li>The admin will enter this code to verify and process your payout</li>
              <li>Once verified, your payout will be processed</li>
            </ol>
            <p className="security-warning">
              <strong>Important:</strong> Never share your action codes with anyone except the admin who initiated your
              payout.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <BookersHeader />
      <div className="ticket-info-container">
        <div className="ticket-info-header">
          <div className="event-image-container">
            <img src={eventData.eventImage || "/placeholder.svg"} alt={eventData.eventName} className="event-image" />
          </div>
          <div className="event-header-details">
            <h1>{eventData.eventName}</h1>
            <p className="event-date">
              {new Date(eventData.eventDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="event-location">{eventData.eventVenue || "No location specified"}</p>
            <div className="event-actions">
              <button className="verify-ticket-btn" onClick={handleVerifyTicket}>
                Verify Ticket
              </button>
              <button className="edit-event-btn" onClick={handleEditEvent}>
                Edit Event
              </button>
            </div>
          </div>
        </div>

        <div className="ticket-info-tabs">
          <button
            className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === "attendees" ? "active" : ""}`}
            onClick={() => setActiveTab("attendees")}
          >
            Attendees
          </button>
          <button
            className={`tab-button ${activeTab === "payouts" ? "active" : ""}`}
            onClick={() => setActiveTab("payouts")}
          >
            Payouts
          </button>
          <button className={`tab-button ${activeTab === "edit" ? "active" : ""}`} onClick={() => setActiveTab("edit")}>
            Edit Event
          </button>
          <button
            className={`tab-button ${activeTab === "discounts" ? "active" : ""}`}
            onClick={() => setActiveTab("discounts")}
          >
            Discounts
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="ticket-info-content">
          {activeTab === "overview" && (
            <div className="overview-tab">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Tickets Sold</h3>
                  <p className="stat-value">
                    {eventData.ticketsSold}
                    {eventData.enableMaxSize && eventData.maxSize && (
                      <span className="capacity-indicator"> / {eventData.maxSize}</span>
                    )}
                  </p>
                  {eventData.enableMaxSize && eventData.maxSize && (
                    <div className="progress-bar">
                      <div
                        className="progress"
                        style={{ width: `${(eventData.ticketsSold / Number.parseInt(eventData.maxSize)) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                <div className="stat-card">
                  <h3>Total Revenue</h3>
                  <p className="stat-value">₦{eventData.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="stat-card highlight">
                  <h3>Available Balance</h3>
                  <p className="stat-value">₦{availableBalance.toFixed(2)}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Paid Out</h3>
                  <p className="stat-value">₦{totalPaidOut.toFixed(2)}</p>
                </div>
              </div>

              {/* Payment Requisites Section */}
              <div className="payment-requisites">
                <h3>Payment Requisites</h3>
                <div className="requisites-grid">
                  <div className="requisite-item">
                    <label>Event ID</label>
                    <div className="copy-field">
                      <input type="text" value={eventData.id} readOnly />
                      <button className="copy-button" onClick={() => copyToClipboard(eventData.id, "eventId")}>
                        {copiedField === "eventId" ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="requisite-item">
                    <label>Pay ID</label>
                    <div className="copy-field">
                      <input type="text" value={eventData.payId || "Not set"} readOnly />
                      <button
                        className="copy-button"
                        onClick={() => copyToClipboard(eventData.payId || "", "payId")}
                        disabled={!eventData.payId}
                      >
                        {copiedField === "payId" ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="requisite-item">
                    <label>Booker Verification Tag (BVT)</label>
                    <div className="copy-field">
                      <input type="text" value={bookerBVT || "Not verified"} readOnly />
                      <button
                        className="copy-button"
                        onClick={() => copyToClipboard(bookerBVT || "", "bvt")}
                        disabled={!bookerBVT}
                      >
                        {copiedField === "bvt" ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="event-description">
                <h3>Event Description</h3>
                <p>{eventData.eventDescription || "No description provided."}</p>
              </div>

              <div className="sales-chart-container">
                <h3>Ticket Sales Over Time</h3>
                {ticketSalesByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={ticketSalesByDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="count" name="Tickets Sold" stroke="#6b2fa5" fill="#d0b9e8" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data-message">No sales data available yet.</p>
                )}
              </div>

              <div className="ticket-types">
                <h3>Ticket Types</h3>
                <div className="ticket-types-chart-container">
                  {ticketTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ticketTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Tickets Sold" fill="#6b2fa5" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-data-message">No ticket type data available yet.</p>
                  )}
                </div>
                <table className="ticket-types-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Price</th>
                      <th>Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventData.isFree ? (
                      <tr>
                        <td>Free Admission</td>
                        <td>₦0.00</td>
                        <td>{eventData.ticketsSold}</td>
                      </tr>
                    ) : (
                      eventData.ticketPrices.map((ticket, index) => {
                        // Find count of this ticket type
                        const typeData = ticketSalesByType.find((t) => t.type === ticket.policy)
                        const soldCount = typeData ? typeData.count : 0

                        return (
                          <tr key={index}>
                            <td>{ticket.policy}</td>
                            <td>₦{Number.parseFloat(ticket.price.toString()).toFixed(2)}</td>
                            <td>{soldCount}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "attendees" && renderAttendeesTab()}
          {activeTab === "payouts" && renderPayoutsTab()}
          {activeTab === "discounts" && renderDiscountsTab()}

          {activeTab === "edit" && editFormData && (
            <div className="edit-tab">
              <h3>Edit Event</h3>
              <form onSubmit={handleSubmitEdit}>
                <div className="event-section">
                  <h3>Event Bio-Data</h3>
                  <label>Event Name</label>
                  <input
                    type="text"
                    name="eventName"
                    value={editFormData.eventName}
                    onChange={handleInputChange}
                    required
                  />

                  <label>Event Description</label>
                  <textarea
                    name="eventDescription"
                    value={editFormData.eventDescription}
                    onChange={handleInputChange}
                    required
                  ></textarea>

                  <label>Event Date</label>
                  <input
                    type="datetime-local"
                    name="eventDate"
                    value={editFormData.eventDate}
                    onChange={handleInputChange}
                    required
                  />

                  <label>Event Venue</label>
                  <input
                    type="text"
                    name="eventVenue"
                    value={editFormData.eventVenue}
                    onChange={handleInputChange}
                    required
                  />

                  <label>Event Start Time</label>
                  <input
                    type="time"
                    name="eventStart"
                    value={editFormData.eventStart}
                    onChange={handleInputChange}
                    required
                  />

                  <label>Event End Date</label>
                  <input
                    type="date"
                    name="eventEndDate"
                    value={editFormData.eventEndDate}
                    onChange={handleInputChange}
                    required
                  />

                  <label>Event End Time</label>
                  <input
                    type="time"
                    name="eventEnd"
                    value={editFormData.eventEnd}
                    onChange={handleInputChange}
                    required
                  />

                  <label>Event Type</label>
                  <select name="eventType" value={editFormData.eventType} onChange={handleInputChange} required>
                    <option value="Night party">Night party</option>
                    <option value="Concert">Concert</option>
                    <option value="Conference">Conference</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="event-section">
                  <h3>Pricing</h3>
                  <div className="option-with-help switch-container">
                    <label>
                      Enable Pricing
                      <div className="switch">
                        <input
                          type="checkbox"
                          name="enablePricing"
                          checked={editFormData.enablePricing}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              enablePricing: e.target.checked,
                            })
                          }
                        />
                        <span className="slider round"></span>
                      </div>
                    </label>
                  </div>

                  {editFormData.enablePricing && (
                    <>
                      {editFormData.ticketPrices && editFormData.ticketPrices.length > 0 ? (
                        editFormData.ticketPrices.map((ticket, index) => (
                          <div key={index} className="ticket-pricing-row">
                            <input
                              type="text"
                              placeholder="Ticket Type"
                              value={ticket.policy}
                              onChange={(e) => handleTicketPriceChange(index, "policy", e.target.value)}
                              required
                            />
                            <input
                              type="number"
                              placeholder="Price"
                              value={ticket.price}
                              onChange={(e) => handleTicketPriceChange(index, "price", e.target.value)}
                              required
                            />
                          </div>
                        ))
                      ) : (
                        // If no ticket prices exist, add a default one
                        <div className="ticket-pricing-row">
                          <input
                            type="text"
                            placeholder="Ticket Type"
                            value=""
                            onChange={(e) => handleTicketPriceChange(0, "policy", e.target.value)}
                            required
                          />
                          <input
                            type="number"
                            placeholder="Price"
                            value="0"
                            onChange={(e) => handleTicketPriceChange(0, "price", e.target.value)}
                            required
                          />
                        </div>
                      )}
                      <button type="button" className="add-price-button" onClick={addTicketPrice}>
                        + Add Ticket Type
                      </button>
                    </>
                  )}
                </div>

                <div className="event-section">
                  <h3>Additional Settings</h3>

                  <div className="option-row switch-container">
                    <label>
                      Enable Stop Date for Ticket Sales
                      <div className="switch">
                        <input
                          type="checkbox"
                          name="enableStopDate"
                          checked={editFormData.enableStopDate}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              enableStopDate: e.target.checked,
                            })
                          }
                        />
                        <span className="slider round"></span>
                      </div>
                    </label>
                    {editFormData.enableStopDate && (
                      <input
                        type="datetime-local"
                        name="stopDate"
                        value={editFormData.stopDate}
                        onChange={handleInputChange}
                        required={editFormData.enableStopDate}
                      />
                    )}
                  </div>

                  <div className="option-row switch-container">
                    <label>
                      Enable Color Theme for Event
                      <div className="switch">
                        <input
                          type="checkbox"
                          name="enableColorCode"
                          checked={editFormData.enableColorCode}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              enableColorCode: e.target.checked,
                            })
                          }
                        />
                        <span className="slider round"></span>
                      </div>
                    </label>
                    {editFormData.enableColorCode && (
                      <input
                        type="color"
                        name="colorCode"
                        value={editFormData.colorCode}
                        onChange={handleInputChange}
                      />
                    )}
                  </div>

                  <div className="option-row switch-container">
                    <label>
                      Set Maximum Attendees
                      <div className="switch">
                        <input
                          type="checkbox"
                          name="enableMaxSize"
                          checked={editFormData.enableMaxSize}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              enableMaxSize: e.target.checked,
                            })
                          }
                        />
                        <span className="slider round"></span>
                      </div>
                    </label>
                    {editFormData.enableMaxSize && (
                      <input
                        type="number"
                        name="maxSize"
                        value={editFormData.maxSize}
                        onChange={handleInputChange}
                        min="1"
                        required={editFormData.enableMaxSize}
                      />
                    )}
                  </div>
                </div>

                <div className="edit-actions">
                  <button type="submit" className="save-button">
                    Save Changes
                  </button>
                  <button type="button" className="cancel-button" onClick={() => setActiveTab("overview")}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default BookerTicketInfo
