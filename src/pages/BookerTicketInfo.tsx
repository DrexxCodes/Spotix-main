"use client"

import type React from "react"
import { useState, useEffect, useMemo, Suspense } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, query, orderBy } from "firebase/firestore"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "../booker-ticket-info-override.css"
import "../components/skeleton.css"

// Import tab components
import OverviewTab, { OverviewTabSkeleton } from "../components/overview-tab"
import AttendeesTab, { AttendeesTabSkeleton } from "../components/attendees-tab"
import DiscountsTab, { DiscountsTabSkeleton } from "../components/discounts-tab"
import PayoutsTab, { PayoutsTabSkeleton } from "../components/payouts-tab"
import EditEventTab, { EditEventTabSkeleton } from "../components/edit-event-tab"

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
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["overview"])) // Track loaded tabs
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

  // Handle tab switching with lazy loading
  const handleTabSwitch = (tab: "overview" | "attendees" | "payouts" | "edit" | "discounts") => {
    setActiveTab(tab)
    setLoadedTabs((prev) => new Set([...Array.from(prev), tab]))
  }

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
            availableRevenue: data.availableRevenue,
            totalPaidOut: data.totalPaidOut,
          }

          setEventData(eventDataObj)
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
                  active: discountData.active !== false,
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

          // Fetch payouts
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

              if (eventDataObj.totalPaidOut !== undefined) {
                setTotalPaidOut(eventDataObj.totalPaidOut)
              } else {
                setTotalPaidOut(calculatedTotalPaidOut)
              }

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
    handleTabSwitch("edit")
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

      const codeExists = discounts.some((discount) => discount.code.toLowerCase() === newDiscount.code.toLowerCase())

      if (codeExists) {
        alert("This discount code already exists. Please use a different code.")
        setLoading(false)
        return
      }

      const discountsCollectionRef = collection(db, "events", user.uid, "userEvents", id, "discounts")
      await addDoc(discountsCollectionRef, newDiscount)

      setDiscounts([...discounts, newDiscount])

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

      const discountToUpdate = discounts[index]
      const discountsCollectionRef = collection(db, "events", user.uid, "userEvents", id, "discounts")
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

      const updateData = {
        eventName: editFormData.eventName,
        eventDescription: editFormData.eventDescription,
        eventDate: editFormData.eventDate,
        eventEndDate: editFormData.eventEndDate,
        eventVenue: editFormData.eventVenue,
        eventStart: editFormData.eventStart,
        eventEnd: editFormData.eventEnd,
        eventType: editFormData.eventType,
        isFree: !editFormData.enablePricing,
        ticketPrices: editFormData.enablePricing ? editFormData.ticketPrices : [],
        enableStopDate: editFormData.enableStopDate,
        stopDate: editFormData.enableStopDate ? editFormData.stopDate : null,
        enableColorCode: editFormData.enableColorCode,
        colorCode: editFormData.enableColorCode ? editFormData.colorCode : null,
        enableMaxSize: editFormData.enableMaxSize,
        maxSize: editFormData.enableMaxSize ? editFormData.maxSize : null,
      }

      const eventDocRef = doc(db, "events", user.uid, "userEvents", id)
      await updateDoc(eventDocRef, updateData)

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
        setEditFormData({
          ...updatedEventData,
          enablePricing: !data.isFree,
        })
      }

      handleTabSwitch("overview")
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

      const payout = payouts.find((p) => p.id === payoutId)
      if (!payout) {
        throw new Error("Payout not found")
      }

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

      const payoutDocRef = doc(db, "events", user.uid, "userEvents", id, "payouts", payoutId)
      await updateDoc(payoutDocRef, {
        status: "Confirmed",
        confirmedAt: new Date(),
        confirmedBy: user.uid,
      })

      const updatedPayouts = payouts.map((p) => {
        if (p.id === payoutId) {
          return { ...p, status: "Confirmed" }
        }
        return p
      })
      setPayouts(updatedPayouts)

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

  const formatTransactionTime = (timestamp: any): string => {
    if (!timestamp) return "Unknown"

    if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
      try {
        const date = new Date(timestamp.seconds * 1000)
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } catch (error) {
        console.error("Error formatting transaction time:", error)
        return "Invalid time"
      }
    }

    return String(timestamp)
  }

  // Render tab content with lazy loading
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return loadedTabs.has("overview") ? (
          <Suspense fallback={<OverviewTabSkeleton />}>
            <OverviewTab
              eventData={eventData!}
              availableBalance={availableBalance}
              totalPaidOut={totalPaidOut}
              copiedField={copiedField}
              bookerBVT={bookerBVT}
              ticketSalesByDay={ticketSalesByDay}
              ticketSalesByType={ticketSalesByType}
              ticketTypeData={ticketTypeData}
              copyToClipboard={copyToClipboard}
            />
          </Suspense>
        ) : (
          <OverviewTabSkeleton />
        )

      case "attendees":
        return loadedTabs.has("attendees") ? (
          <Suspense fallback={<AttendeesTabSkeleton />}>
            <AttendeesTab attendees={attendees} formatFirestoreTimestamp={formatFirestoreTimestamp} />
          </Suspense>
        ) : (
          <AttendeesTabSkeleton />
        )

      case "discounts":
        return loadedTabs.has("discounts") ? (
          <Suspense fallback={<DiscountsTabSkeleton />}>
            <DiscountsTab
              discounts={discounts}
              newDiscount={newDiscount}
              handleDiscountInputChange={handleDiscountInputChange}
              handleAddDiscount={handleAddDiscount}
              handleToggleDiscountStatus={handleToggleDiscountStatus}
            />
          </Suspense>
        ) : (
          <DiscountsTabSkeleton />
        )

      case "payouts":
        return loadedTabs.has("payouts") ? (
          <Suspense fallback={<PayoutsTabSkeleton />}>
            <PayoutsTab
              payouts={payouts}
              availableBalance={availableBalance}
              totalPaidOut={totalPaidOut}
              selectedPayoutId={selectedPayoutId}
              actionCode={actionCode}
              copiedField={copiedField}
              visibleActionCodes={visibleActionCodes}
              setSelectedPayoutId={setSelectedPayoutId}
              setActionCode={setActionCode}
              handleConfirmPayout={handleConfirmPayout}
              copyToClipboard={copyToClipboard}
              toggleActionCodeVisibility={toggleActionCodeVisibility}
              formatTransactionTime={formatTransactionTime}
            />
          </Suspense>
        ) : (
          <PayoutsTabSkeleton />
        )

      case "edit":
        return loadedTabs.has("edit") && editFormData ? (
          <Suspense fallback={<EditEventTabSkeleton />}>
            <EditEventTab
              editFormData={editFormData}
              handleInputChange={handleInputChange}
              handleTicketPriceChange={handleTicketPriceChange}
              addTicketPrice={addTicketPrice}
              handleSubmitEdit={handleSubmitEdit}
              setActiveTab={handleTabSwitch}
              setEditFormData={setEditFormData}
            />
          </Suspense>
        ) : (
          <EditEventTabSkeleton />
        )

      default:
        return <OverviewTabSkeleton />
    }
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
            onClick={() => handleTabSwitch("overview")}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === "attendees" ? "active" : ""}`}
            onClick={() => handleTabSwitch("attendees")}
          >
            Attendees
          </button>
          <button
            className={`tab-button ${activeTab === "payouts" ? "active" : ""}`}
            onClick={() => handleTabSwitch("payouts")}
          >
            Payouts
          </button>
          <button
            className={`tab-button ${activeTab === "edit" ? "active" : ""}`}
            onClick={() => handleTabSwitch("edit")}
          >
            Edit Event
          </button>
          <button
            className={`tab-button ${activeTab === "discounts" ? "active" : ""}`}
            onClick={() => handleTabSwitch("discounts")}
          >
            Discounts
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="ticket-info-content">{renderTabContent()}</div>
      </div>
      <Footer />
    </>
  )
}

export default BookerTicketInfo
