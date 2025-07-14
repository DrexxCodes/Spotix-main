"use client"

import type React from "react"
import { useState } from "react"
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc } from "firebase/firestore"
import { db } from "../services/firebase"
import { Search, Plus, X, Check, User, Mail, CreditCard, Send } from "lucide-react"
import "./addattendee.css"
import QRCode from "qrcode"

interface AttendeeData {
  id: string
  fullName: string
  email: string
  ticketType: string
  verified: boolean
  purchaseDate: string
  purchaseTime: string
  ticketReference: string
  ticketPrice: number
  paymentMethod: string
}

interface TicketType {
  policy: string
  price: number
}

interface EventData {
  eventName: string
  ticketPrices: TicketType[]
  isFree: boolean
  eventVenue: string
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  eventType: string
  ticketsSold: number
  totalRevenue: number
  createdBy: string
}

interface BookerData {
  fullName: string
  email: string
  phoneNumber: string
  isVerified: boolean
}

interface AddAttendeeTabProps {
  setMessage: (message: { text: string; type: string }) => void
  setLoading: (loading: boolean) => void
}

const AddAttendeeTab: React.FC<AddAttendeeTabProps> = ({ setMessage, setLoading }) => {
  const [bookerID, setBookerID] = useState("")
  const [eventID, setEventID] = useState("")
  const [attendees, setAttendees] = useState<AttendeeData[]>([])
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)

  // Dialog form state
  const [attendeeName, setAttendeeName] = useState("")
  const [attendeeEmail, setAttendeeEmail] = useState("")
  const [selectedTicketType, setSelectedTicketType] = useState("")
  const [ticketPrice, setTicketPrice] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [sendEmailConfirmation, setSendEmailConfirmation] = useState(true)

  const [bookerData, setBookerData] = useState<BookerData | null>(null)
  const [createdTicketId, setCreatedTicketId] = useState("")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const [showTicketResult, setShowTicketResult] = useState(false)

  // Add these state variables after the existing state declarations that's after ticket making from Chicago Server
  const [createdTicketInfo, setCreatedTicketInfo] = useState<{
    name: string
    email: string
    ticketId: string
    ticketReference: string
  } | null>(null)

  // Generate unique ticket ID
  const generateTicketId = () => {
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000).toString()
    const randomLetters = Math.random().toString(36).substring(2, 4).toUpperCase()

    const pos1 = Math.floor(Math.random() * 8)
    const pos2 = Math.floor(Math.random() * 7) + pos1 + 1

    const part1 = randomNumbers.substring(0, pos1)
    const part2 = randomNumbers.substring(pos1, pos2)
    const part3 = randomNumbers.substring(pos2)

    return `SPTX-TX-${part1}${randomLetters[0]}${part2}${randomLetters[1]}${part3}`
  }

  // Generate transaction reference
  const generateReference = () => {
    const letters = Math.random().toString(36).substring(2, 8).toUpperCase()
    const numbers = Math.floor(1000 + Math.random() * 9000).toString()
    return `${letters}${numbers}`
  }

  const generateQRCode = async (documentId: string) => {
    try {
      const qrCodeUrl = await QRCode.toDataURL(documentId, {
        color: {
          dark: "#6b2fa5",
          light: "#FFFFFF",
        },
        width: 200,
        margin: 2,
      })
      return qrCodeUrl
    } catch (error) {
      console.error("Error generating QR code:", error)
      return ""
    }
  }

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  // Handle ticket type selection
  const handleTicketTypeChange = (ticketType: string) => {
    setSelectedTicketType(ticketType)

    if (eventData) {
      if (eventData.isFree) {
        setTicketPrice(0)
      } else {
        const selectedTicket = eventData.ticketPrices.find((ticket) => ticket.policy === ticketType)
        if (selectedTicket) {
          const basePrice = selectedTicket.price
          const finalPrice = basePrice === 0 ? 0 : basePrice + 150 
          setTicketPrice(finalPrice)
        }
      }
    }
  }

  const handleLookup = async () => {
    if (!bookerID.trim() || !eventID.trim()) {
      setMessage({ text: "Please enter both Booker ID and Event ID", type: "error" })
      return
    }

    setIsLookingUp(true)

    try {
      // First, get event data
      const eventDocRef = doc(db, "events", bookerID, "userEvents", eventID)
      const eventDoc = await getDoc(eventDocRef)

      if (!eventDoc.exists()) {
        setMessage({ text: "Event not found", type: "error" })
        setAttendees([])
        setEventData(null)
        setBookerData(null)
        return
      }

      const eventInfo = eventDoc.data() as EventData
      setEventData(eventInfo)

      // Get booker details
      const bookerDocRef = doc(db, "users", bookerID)
      const bookerDoc = await getDoc(bookerDocRef)

      if (bookerDoc.exists()) {
        const bookerInfo = bookerDoc.data() as BookerData
        setBookerData(bookerInfo)
      } else {
        setBookerData({
          fullName: "Unknown Booker",
          email: "unknown@example.com",
          phoneNumber: "Not provided",
          isVerified: false,
        })
      }

      // Get attendees
      const attendeesCollectionRef = collection(db, "events", bookerID, "userEvents", eventID, "attendees")
      const attendeesSnapshot = await getDocs(attendeesCollectionRef)

      const attendeesList: AttendeeData[] = []
      attendeesSnapshot.forEach((doc) => {
        attendeesList.push({
          id: doc.id,
          ...doc.data(),
        } as AttendeeData)
      })

      setAttendees(attendeesList)
      setMessage({
        text: `Found ${attendeesList.length} attendees for event: ${eventInfo.eventName}`,
        type: "success",
      })
    } catch (error) {
      console.error("Error looking up attendees:", error)
      setMessage({ text: "Error looking up attendees", type: "error" })
      setAttendees([])
      setEventData(null)
      setBookerData(null)
    } finally {
      setIsLookingUp(false)
    }
  }

  // Reset dialog form
  const resetDialogForm = () => {
    setAttendeeName("")
    setAttendeeEmail("")
    setSelectedTicketType("")
    setTicketPrice(0)
    setPaymentMethod("Cash")
    setSendEmailConfirmation(true)
  }

  // Open add attendee dialog
  const handleAddAttendee = () => {
    if (!eventData) {
      setMessage({ text: "Please lookup an event first", type: "error" })
      return
    }
    setShowDialog(true)
  }

  // Close dialog
  const handleCloseDialog = () => {
    setShowDialog(false)
    resetDialogForm()
  }

  const handleCloseTicketResult = () => {
    setShowTicketResult(false)
    setCreatedTicketId("")
    setQrCodeDataUrl("")
    setCreatedTicketInfo(null) 
  }

  const sendConfirmationEmail = async (ticketId: string, ticketReference: string) => {
    if (!eventData || !bookerData || !sendEmailConfirmation) return

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

      const response = await fetch(`${BACKEND_URL}/api/mail/payment-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: attendeeEmail, 
          name: attendeeName, 
          ticket_ID: ticketId,
          event_host: bookerData.fullName,
          event_name: eventData.eventName,
          payment_ref: ticketReference,
          ticket_type: selectedTicketType,
          booker_email: bookerData.email,
          ticket_price: ticketPrice.toFixed(2),
          payment_method: paymentMethod,
          event_venue: eventData.eventVenue,
          event_date: new Date(eventData.eventDate).toLocaleDateString(),
          event_start: eventData.eventStart,
          event_end: eventData.eventEnd,
          transaction_id: `admin-${Date.now()}`,
          transaction_date: new Date().toLocaleDateString(),
          transaction_time: new Date().toLocaleTimeString(),
        }),
      })

      if (!response.ok) {
        console.error("Failed to send confirmation email")
      }
    } catch (error) {
      console.error("Error sending confirmation email:", error)
    }
  }

  const handleCreateTicket = async () => {
    if (!attendeeName.trim() || !attendeeEmail.trim() || !selectedTicketType) {
      setMessage({ text: "Please fill in all required fields", type: "error" })
      return
    }

    if (!eventData || !bookerData) {
      setMessage({ text: "Event or booker data not available", type: "error" })
      return
    }

    setIsCreatingTicket(true)

    try {
      const ticketId = generateTicketId()
      const ticketReference = generateReference()
      const now = new Date()
      const purchaseDate = now.toLocaleDateString()
      const purchaseTime = now.toLocaleTimeString()

      // Create ticket data with form input attendee information
      const ticketData = {
        fullName: attendeeName, 
        email: attendeeEmail, 
        ticketType: selectedTicketType,
        ticketId,
        ticketReference,
        purchaseDate,
        purchaseTime,
        verified: true,
        verificationDate: purchaseDate,
        verificationTime: purchaseTime,
        paymentMethod,
        ticketPrice,
        totalAmount: ticketPrice,
        createdBy: "admin",
        createdAt: now.toISOString(),
        eventVenue: eventData.eventVenue,
        eventDate: eventData.eventDate,
        eventEndDate: eventData.eventEndDate,
        eventStart: eventData.eventStart,
        eventEnd: eventData.eventEnd,
        eventType: eventData.eventType,
        bookerName: bookerData.fullName,
        bookerEmail: bookerData.email,
        eventName: eventData.eventName,
        eventId: eventID,
        eventCreatorId: bookerID,
      }

      // Add to attendees collection
      const attendeesCollectionRef = collection(db, "events", bookerID, "userEvents", eventID, "attendees")
      const attendeeDocRef = await addDoc(attendeesCollectionRef, ticketData)
      const documentId = attendeeDocRef.id

      // Add to Strays collection with the same document ID
      const straysDocRef = doc(db, "Strays", documentId)
      await setDoc(straysDocRef, {
        ...ticketData,
      })

      // Update event statistics
      const eventDocRef = doc(db, "events", bookerID, "userEvents", eventID)
      const currentTicketsSold = eventData.ticketsSold || 0
      const currentTotalRevenue = eventData.totalRevenue || 0

      // Calculate revenue (ticket price minus 150 fee, but don't go below 0)
      const revenueToAdd = Math.max(0, ticketPrice - 150)

      await updateDoc(eventDocRef, {
        ticketsSold: currentTicketsSold + 1,
        totalRevenue: currentTotalRevenue + revenueToAdd,
      })

      // Generate QR code using document ID
      const qrCodeUrl = await generateQRCode(documentId)
      setQrCodeDataUrl(qrCodeUrl)
      setCreatedTicketId(documentId)

      // After generating QR code and before showing ticket result, add:
      setCreatedTicketInfo({
        name: attendeeName,
        email: attendeeEmail,
        ticketId: ticketId,
        ticketReference: ticketReference,
      })

      // Send confirmation email if enabled (using form input email)
      if (sendEmailConfirmation) {
        await sendConfirmationEmail(ticketId, ticketReference)
      }

      // Show ticket result
      setShowTicketResult(true)

      // Refresh attendees list
      await handleLookup()

      setMessage({
        text: `Ticket created successfully for ${attendeeName}${sendEmailConfirmation ? " and confirmation email sent" : ""}`,
        type: "success",
      })

      handleCloseDialog()
    } catch (error) {
      console.error("Error creating ticket:", error)
      setMessage({ text: "Error creating ticket", type: "error" })
    } finally {
      setIsCreatingTicket(false)
    }
  }

  return (
    <div className="add-attendee-tab">
      <div className="add-attendee-header">
        <h3>Add Attendee</h3>
        <p>Manually add attendees to events</p>
      </div>

      {/* Lookup Section */}
      <div className="lookup-section">
        <h4>Event Lookup</h4>
        <div className="lookup-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bookerID">Booker ID</label>
              <input
                type="text"
                id="bookerID"
                value={bookerID}
                onChange={(e) => setBookerID(e.target.value)}
                placeholder="Enter booker ID"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="eventID">Event ID</label>
              <input
                type="text"
                id="eventID"
                value={eventID}
                onChange={(e) => setEventID(e.target.value)}
                placeholder="Enter event ID"
                className="form-input"
              />
            </div>
            <button onClick={handleLookup} disabled={isLookingUp} className="lookup-btn">
              {isLookingUp ? (
                <>
                  <div className="spinner"></div>
                  Looking up...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Look up
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Attendees Table */}
      {attendees.length > 0 && (
        <div className="attendees-section">
          <div className="section-header">
            <h4>Attendees ({attendees.length})</h4>
            <button onClick={handleAddAttendee} className="add-attendee-btn">
              <Plus size={16} />
              Add Attendee
            </button>
          </div>

          {eventData && bookerData && (
            <div className="event-info-display">
              <div className="event-info-grid">
                <div className="event-info-item">
                  <span className="info-label">Event:</span>
                  <span className="info-value">{eventData.eventName}</span>
                </div>
                <div className="event-info-item">
                  <span className="info-label">Booker:</span>
                  <span className="info-value">{bookerData.fullName}</span>
                </div>
                <div className="event-info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{bookerData.email}</span>
                </div>
                <div className="event-info-item">
                  <span className="info-label">Venue:</span>
                  <span className="info-value">{eventData.eventVenue}</span>
                </div>
                <div className="event-info-item">
                  <span className="info-label">Date:</span>
                  <span className="info-value">{new Date(eventData.eventDate).toLocaleDateString()}</span>
                </div>
                <div className="event-info-item">
                  <span className="info-label">Time:</span>
                  <span className="info-value">
                    {eventData.eventStart} - {eventData.eventEnd}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="attendees-table-container">
            <table className="attendees-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Ticket Type</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((attendee) => (
                  <tr key={attendee.id}>
                    <td>{attendee.fullName}</td>
                    <td className="email-cell">{attendee.email}</td>
                    <td>
                      <span className="ticket-type-badge">{attendee.ticketType}</span>
                    </td>
                    <td className="verified-cell">
                      {attendee.verified ? (
                        <Check size={16} className="verified-icon" />
                      ) : (
                        <X size={16} className="unverified-icon" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Attendee Dialog */}
      {showDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-header">
              <h4>Add New Attendee</h4>
              <button onClick={handleCloseDialog} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="dialog-content">
              <div className="form-group">
                <label htmlFor="attendeeName">
                  <User size={16} />
                  Attendee Full Name *
                </label>
                <input
                  type="text"
                  id="attendeeName"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  placeholder="Enter full name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="attendeeEmail">
                  <Mail size={16} />
                  Email *
                </label>
                <input
                  type="email"
                  id="attendeeEmail"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ticketType">Ticket Type *</label>
                <select
                  id="ticketType"
                  value={selectedTicketType}
                  onChange={(e) => handleTicketTypeChange(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select ticket type</option>
                  {eventData?.isFree ? (
                    <option value="Free Admission">Free Admission</option>
                  ) : (
                    eventData?.ticketPrices?.map((ticket, index) => (
                      <option key={index} value={ticket.policy}>
                        {ticket.policy}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedTicketType && (
                <div className="price-display">
                  <div className="price-info">
                    <span>Ticket Price: ₦{formatNumber(ticketPrice)}</span>
                    {ticketPrice > 0 && <small>(Base price + ₦150 processing fee)</small>}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="paymentMethod">
                  <CreditCard size={16} />
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-select"
                >
                  <option value="Cash">Cash</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={sendEmailConfirmation}
                    onChange={(e) => setSendEmailConfirmation(e.target.checked)}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text">
                    <Send size={16} />
                    Send Email Confirmation
                  </span>
                </label>
              </div>
            </div>

            <div className="dialog-footer">
              <button onClick={handleCloseDialog} className="cancel-btn">
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={isCreatingTicket || !attendeeName.trim() || !attendeeEmail.trim() || !selectedTicketType}
                className="create-btn"
              >
                {isCreatingTicket ? (
                  <>
                    <div className="spinner"></div>
                    Creating...
                  </>
                ) : (
                  "Create Ticket"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Result Modal */}
      {showTicketResult && (
        <div className="dialog-overlay">
          <div className="dialog ticket-result-dialog">
            <div className="dialog-header">
              <h4>Ticket Created Successfully</h4>
              <button onClick={handleCloseTicketResult} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="dialog-content">
              <div className="ticket-result-content">
                <div className="ticket-info-section">
                  <h5>Ticket Information</h5>
                  <div className="ticket-detail">
                    <span>Ticket ID:</span>
                    <span className="ticket-id-value">{createdTicketId}</span>
                  </div>
                  <div className="ticket-detail">
                    <span>Attendee:</span>
                    <span>{createdTicketInfo?.name || "N/A"}</span>
                  </div>
                  <div className="ticket-detail">
                    <span>Email:</span>
                    <span>{createdTicketInfo?.email || "N/A"}</span>
                  </div>
                  <div className="ticket-detail">
                    <span>Event:</span>
                    <span>{eventData?.eventName}</span>
                  </div>
                  <div className="ticket-detail">
                    <span>Venue:</span>
                    <span>{eventData?.eventVenue}</span>
                  </div>
                  <div className="ticket-detail">
                    <span>Date:</span>
                    <span>{eventData?.eventDate ? new Date(eventData.eventDate).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="ticket-detail">
                    <span>Time:</span>
                    <span>
                      {eventData?.eventStart} - {eventData?.eventEnd}
                    </span>
                  </div>
                </div>

                {qrCodeDataUrl && (
                  <div className="qr-code-section">
                    <h5>Ticket QR Code</h5>
                    <div className="qr-code-container">
                      <img src={qrCodeDataUrl || "/placeholder.svg"} alt="Ticket QR Code" className="qr-code-image" />
                      <p className="qr-code-caption">QR Code</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="dialog-footer">
              <button onClick={handleCloseTicketResult} className="create-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddAttendeeTab
