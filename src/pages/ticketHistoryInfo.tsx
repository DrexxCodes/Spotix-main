"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc } from "firebase/firestore"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import DownloadButton from "../components/DownloadButton"
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, MapPin } from "lucide-react"
import html2pdf from "html2pdf.js"
import QRCode from "react-qr-code"
import "boxicons/css/boxicons.min.css"
// import "../styles/ticket-info.css"

interface TicketDetails {
  id: string
  eventId: string
  eventName: string
  eventType: string
  ticketType: string
  ticketPrice: number
  ticketId: string
  ticketReference: string
  purchaseDate: string
  purchaseTime: string
  verified: boolean
  paymentMethod: string
  eventCreatorId?: string
  eventDate?: string
  eventEndDate?: string
  eventStart?: string
  eventEnd?: string
  eventVenue?: string
  stopDate?: string
}

interface EventDetails {
  eventName: string
  eventDescription: string
  eventDate: string
  eventEndDate: string
  eventVenue: string
  eventStart: string
  eventEnd: string
  eventType: string
  eventImage: string
  stopDate?: string
  enableStopDate?: boolean
  enableColorCode?: boolean
  colorCode?: string
  enableMaxSize?: boolean
  maxSize?: string
  isFree: boolean
  ticketPrices: Array<{ policy: string; price: number | string }>
}

const TicketHistoryInfo = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null)
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadComplete, setIsDownloadComplete] = useState(false)
  const [addingToCalendar, setAddingToCalendar] = useState(false)
  const ticketRef = useRef<HTMLDivElement>(null)

  // Cache key for this ticket
  const cacheKey = `ticket_${id}`

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "Not specified"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  // Format time for display
  const formatDisplayTime = (timeString: string) => {
    if (!timeString) return "Not specified"

    // Check if it's already in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      try {
        // Convert 24-hour format to 12-hour format
        const [hours, minutes] = timeString.split(":").map(Number)
        const period = hours >= 12 ? "PM" : "AM"
        const displayHours = hours % 12 || 12 // Convert 0 to 12 for 12 AM
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
      } catch (error) {
        console.error("Error formatting time:", error)
        return timeString
      }
    }

    return timeString
  }

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        if (!id) {
          setError("Ticket ID not found")
          setLoading(false)
          return
        }

        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        // Try to get from cache first
        const cachedData = sessionStorage.getItem(cacheKey)
        if (cachedData) {
          const parsedData = JSON.parse(cachedData)
          setTicketDetails(parsedData)

          // Fetch event details if we have eventId and eventCreatorId
          if (parsedData.eventId && parsedData.eventCreatorId) {
            await fetchEventDetails(parsedData.eventCreatorId, parsedData.eventId)
          }

          setLoading(false)
          // Still fetch in background to update cache
          fetchFromFirestore(user.uid, id)
          return
        }

        // No cache, fetch from Firestore
        await fetchFromFirestore(user.uid, id)
      } catch (error) {
        console.error("Error fetching ticket details:", error)
        setError("Failed to load ticket details")
        setLoading(false)
      }
    }

    const fetchEventDetails = async (creatorId: string, eventId: string) => {
      try {
        const eventDocRef = doc(db, "events", creatorId, "userEvents", eventId)
        const eventDoc = await getDoc(eventDocRef)

        if (eventDoc.exists()) {
          const eventData = eventDoc.data() as EventDetails
          setEventDetails(eventData)

          // Update ticket details with event info
          setTicketDetails((prevDetails) => {
            if (!prevDetails) return null

            return {
              ...prevDetails,
              eventDate: prevDetails.eventDate || eventData.eventDate,
              eventEndDate: prevDetails.eventEndDate || eventData.eventEndDate,
              eventStart: prevDetails.eventStart || eventData.eventStart,
              eventEnd: prevDetails.eventEnd || eventData.eventEnd,
              eventVenue: prevDetails.eventVenue || eventData.eventVenue,
              stopDate: prevDetails.stopDate || (eventData.enableStopDate ? eventData.stopDate : undefined),
            }
          })
        }
      } catch (error) {
        console.error("Error fetching event details:", error)
      }
    }

    const fetchFromFirestore = async (uid: string, ticketId: string) => {
      try {
        const ticketDocRef = doc(db, "TicketHistory", uid, "tickets", ticketId)
        const ticketDoc = await getDoc(ticketDocRef)

        if (ticketDoc.exists()) {
          const data = ticketDoc.data()

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

          // Initialize ticket data with basic info
          const ticketData: TicketDetails = {
            id: ticketDoc.id,
            eventId: data.eventId || "",
            eventName: data.eventName || "Unknown Event",
            eventType: data.eventType || "Unknown",
            ticketType: data.ticketType || "Standard",
            ticketPrice: data.ticketPrice || 0,
            ticketId: data.ticketId || "",
            ticketReference: data.ticketReference || "",
            purchaseDate: purchaseDate,
            purchaseTime: purchaseTime,
            verified: data.verified || false,
            paymentMethod: data.paymentMethod || "Wallet",
            eventCreatorId: data.eventCreatorId || "",
          }

          // If we have event creator and ID, fetch complete event details
          if (data.eventId && data.eventCreatorId) {
            try {
              const eventDocRef = doc(db, "events", data.eventCreatorId, "userEvents", data.eventId)
              const eventDoc = await getDoc(eventDocRef)

              if (eventDoc.exists()) {
                const eventData = eventDoc.data()

                // Store event details for calendar functionality
                setEventDetails(eventData as EventDetails)

                // Update ticket data with event details
                ticketData.eventType = eventData.eventType || ticketData.eventType
                ticketData.eventDate = eventData.eventDate || ""
                ticketData.eventEndDate = eventData.eventEndDate || ""
                ticketData.eventStart = eventData.eventStart || ""
                ticketData.eventEnd = eventData.eventEnd || ""
                ticketData.eventVenue = eventData.eventVenue || ""
                ticketData.stopDate = eventData.enableStopDate ? eventData.stopDate : undefined
              }
            } catch (error) {
              console.error("Error fetching event details:", error)
            }
          }

          // Update state
          setTicketDetails(ticketData)

          // Cache the data
          sessionStorage.setItem(cacheKey, JSON.stringify(ticketData))
        } else {
          setError("Ticket not found")
        }

        setLoading(false)
      } catch (error) {
        console.error("Error in fetchFromFirestore:", error)
        throw error
      }
    }

    fetchTicketDetails()
  }, [id, navigate, cacheKey])

  const handleBackClick = () => {
    navigate("/ticket-history")
  }

  const handleDownloadTicket = async () => {
    if (!ticketRef.current || !ticketDetails) return

    setIsDownloading(true)

    try {
      // Clone the element to modify it for PDF
      const element = ticketRef.current.cloneNode(true) as HTMLElement

      // Create a container for verification status and footer
      const pdfExtras = document.createElement("div")
      pdfExtras.className = "pdf-extras"

      // Add verification status
      const verificationStatus = document.createElement("div")
      verificationStatus.className = "pdf-verification-status"
      if (ticketDetails.verified) {
        verificationStatus.innerHTML = '<div class="verified-status pdf-status"><span>✓ Verified</span></div>'
      } else {
        verificationStatus.innerHTML = '<div class="unverified-status pdf-status"><span>✗ Not Verified</span></div>'
      }
      pdfExtras.appendChild(verificationStatus)

      // Add "Powered by Spotix" footer
      const footer = document.createElement("div")
      footer.className = "pdf-footer"
      footer.textContent = "Powered by Spotix"
      pdfExtras.appendChild(footer)

      // Append to the cloned element
      element.appendChild(pdfExtras)

      // Add some styling for the PDF
      const style = document.createElement("style")
      style.innerHTML = `
        .ticket-info-card {
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .ticket-info-title {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }
        .info-row {
          margin-bottom: 10px;
          display: flex;
        }
        .info-label {
          font-weight: bold;
          width: 150px;
        }
        .ticket-info-status {
          margin-bottom: 20px;
        }
        .pdf-extras {
          margin-top: 20px;
          text-align: center;
        }
        .pdf-verification-status {
          margin-bottom: 15px;
        }
        .pdf-status {
          display: inline-block;
          padding: 8px 15px;
          border-radius: 20px;
          font-weight: bold;
        }
        .verified-status.pdf-status {
          background-color: #d4edda;
          color: #28a745;
        }
        .unverified-status.pdf-status {
          background-color: #f8d7da;
          color: #dc3545;
        }
        .pdf-footer {
          margin-top: 30px;
          font-size: 12px;
          color: #6c757d;
          text-align: center;
        }
        .ticket-qr-code {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 20px;
        }
        .qr-code-label {
          margin-top: 10px;
          font-size: 12px;
          color: #6c757d;
        }
      `
      element.appendChild(style)

      // Generate PDF
      const opt = {
        margin: 10,
        filename: `ticket-${ticketDetails.ticketReference}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }

      await html2pdf().from(element).set(opt).save()

      setIsDownloadComplete(true)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to download ticket. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleAddToCalendar = () => {
    if (!ticketDetails) {
      alert("Ticket details not available")
      return
    }

    setAddingToCalendar(true)

    try {
      // Get event details from both sources
      const eventName = ticketDetails.eventName
      const eventDescription = eventDetails?.eventDescription || "No description available"

      // Get venue information
      const eventVenue = ticketDetails.eventVenue || eventDetails?.eventVenue || "Event Venue"

      // Get date and time information
      const eventDate = ticketDetails.eventDate || eventDetails?.eventDate || ""
      const eventEndDate = ticketDetails.eventEndDate || eventDetails?.eventEndDate || ""
      const eventStart = ticketDetails.eventStart || eventDetails?.eventStart || ""
      const eventEnd = ticketDetails.eventEnd || eventDetails?.eventEnd || ""

      console.log("Calendar data:", {
        eventName,
        eventVenue,
        eventDate,
        eventEndDate,
        eventStart,
        eventEnd,
      })

      if (!eventDate) {
        alert("Event details not available for calendar")
        setAddingToCalendar(false)
        return
      }

      // Format start and end dates for calendar
      let startDate: Date
      let endDate: Date

      try {
        startDate = new Date(eventDate)

        // If we have an end date, use it; otherwise use start date
        endDate = eventEndDate ? new Date(eventEndDate) : new Date(eventDate)

        // Add time if available
        if (eventStart) {
          const [startHours, startMinutes] = eventStart.split(":").map(Number)
          startDate.setHours(startHours, startMinutes)
        }

        if (eventEnd) {
          const [endHours, endMinutes] = eventEnd.split(":").map(Number)
          endDate.setHours(endHours, endMinutes)
        } else if (eventStart) {
          // Default to 2 hour duration if only start time is available
          endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
        }

        // Ensure end date is after start date
        if (endDate <= startDate) {
          endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
        }
      } catch (dateError) {
        console.error("Error parsing dates:", dateError)
        alert("Could not parse event dates. Please try again.")
        setAddingToCalendar(false)
        return
      }

      // Format dates for calendar URL
      const formatDateForCalendar = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, "")
      }

      const startDateFormatted = formatDateForCalendar(startDate)
      const endDateFormatted = formatDateForCalendar(endDate)

      // Create ticket URL
      const ticketUrl = window.location.href

      // Create calendar event details
      const calendarDetails = {
        text: eventName,
        dates: `${startDateFormatted}/${endDateFormatted}`,
        location: eventVenue,
        details: `${eventDescription}\n\nView ticket here: ${ticketUrl}`,
      }

      // Create Google Calendar URL
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarDetails.text)}&dates=${calendarDetails.dates}&location=${encodeURIComponent(calendarDetails.location)}&details=${encodeURIComponent(calendarDetails.details)}`

      // Open calendar in new tab
      window.open(googleCalendarUrl, "_blank")
    } catch (error) {
      console.error("Error adding to calendar:", error)
      alert("Failed to add event to calendar. Please try again.")
    } finally {
      setAddingToCalendar(false)
    }
  }

  if (loading) {
    return <Preloader loading={loading} />
  }

  if (error || !ticketDetails) {
    return (
      <>
        <UserHeader />
        <div className="error-container">
          <h2>{error || "An error occurred"}</h2>
          <button onClick={handleBackClick} className="back-button">
            Back to Tickets
          </button>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <UserHeader />
      <div className="ticket-info-container">
        <div className="ticket-info-header">
          <button className="back-button" onClick={handleBackClick}>
            <ArrowLeft size={24} />
            <span>Back to Tickets</span>
          </button>
        </div>

        <div className="ticket-info-card" ref={ticketRef}>
          <div className="ticket-info-title">
            <img src="/logo.svg" alt="Spotix Logo" className="ticket-logo" />
            <h1>Ticket Details</h1>
          </div>

          <div className="ticket-info-status">
            {ticketDetails.verified ? (
              <div className="verified-status">
                <CheckCircle size={24} />
                <span>Verified</span>
              </div>
            ) : (
              <div className="unverified-status">
                <XCircle size={24} />
                <span>Not Verified</span>
              </div>
            )}
          </div>

          <div className="ticket-info-content">
            <div className="ticket-info-section">
              <h2>Event Information</h2>
              <div className="info-row">
                <div className="info-label">Event Name</div>
                <div className="info-value">{ticketDetails.eventName}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Event Type</div>
                <div className="info-value">{ticketDetails.eventType}</div>
              </div>

              {/* Venue Information */}
              {ticketDetails.eventVenue && (
                <div className="info-row">
                  <div className="info-label">Venue</div>
                  <div className="info-value">
                    <MapPin size={16} className="info-icon" />
                    {ticketDetails.eventVenue}
                  </div>
                </div>
              )}

              {/* Start Date and Time */}
              {ticketDetails.eventDate && (
                <div className="info-row">
                  <div className="info-label">Event Date</div>
                  <div className="info-value">
                    <Calendar size={16} className="info-icon" />
                    {formatDisplayDate(ticketDetails.eventDate)}
                  </div>
                </div>
              )}

              {ticketDetails.eventStart && (
                <div className="info-row">
                  <div className="info-label">Start Time</div>
                  <div className="info-value">
                    <Clock size={16} className="info-icon" />
                    {formatDisplayTime(ticketDetails.eventStart)}
                  </div>
                </div>
              )}

              {/* End Date and Time */}
              {ticketDetails.eventEndDate && (
                <div className="info-row">
                  <div className="info-label">End Date</div>
                  <div className="info-value">
                    <Calendar size={16} className="info-icon" />
                    {formatDisplayDate(ticketDetails.eventEndDate)}
                  </div>
                </div>
              )}

              {ticketDetails.eventEnd && (
                <div className="info-row">
                  <div className="info-label">End Time</div>
                  <div className="info-value">
                    <Clock size={16} className="info-icon" />
                    {formatDisplayTime(ticketDetails.eventEnd)}
                  </div>
                </div>
              )}

              {/* Ticket Sales End Date */}
              {ticketDetails.stopDate && (
                <div className="info-row">
                  <div className="info-label">Sales End</div>
                  <div className="info-value">
                    <Calendar size={16} className="info-icon" />
                    {formatDisplayDate(ticketDetails.stopDate)}
                  </div>
                </div>
              )}

              <div className="info-row">
                <div className="info-label">Ticket Type</div>
                <div className="info-value">{ticketDetails.ticketType}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Price</div>
                <div className="info-value">₦{ticketDetails.ticketPrice.toFixed(2)}</div>
              </div>
            </div>

            <div className="ticket-info-section">
              <h2>Ticket Information</h2>
              <div className="info-row">
                <div className="info-label">Ticket ID</div>
                <div className="info-value ticket-id">{ticketDetails.ticketId}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Reference</div>
                <div className="info-value">{ticketDetails.ticketReference}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Payment Method</div>
                <div className="info-value">{ticketDetails.paymentMethod}</div>
              </div>
            </div>

            <div className="ticket-info-section">
              <h2>Purchase Information</h2>
              <div className="info-row">
                <div className="info-label">Purchase Date</div>
                <div className="info-value">
                  <Calendar size={16} className="info-icon" />
                  {ticketDetails.purchaseDate}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Purchase Time</div>
                <div className="info-value">
                  <Clock size={16} className="info-icon" />
                  {ticketDetails.purchaseTime}
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="ticket-qr-code">
              <QRCode value={ticketDetails.ticketReference} size={200} level="H" fgColor="#6b2fa5" bgColor="#ffffff" />
              <p className="qr-code-label">Scan this QR code at the event entrance(It contains your event details)</p>
            </div>

            <div className="ticket-footer">
              <p className="powered-by">Powered by Spotix</p>
            </div>
          </div>
        </div>

        <div className="ticket-actions">
          <button className="add-to-calendar-button" onClick={handleAddToCalendar} disabled={addingToCalendar}>
            {addingToCalendar ? (
              <span className="button-text">Adding...</span>
            ) : (
              <>
                <i className="bx bxs-calendar-plus"></i>
                <span className="button-text">Add to Calendar</span>
              </>
            )}
          </button>

          <div className="download-button-container">
            <DownloadButton
              onClick={handleDownloadTicket}
              isProcessing={isDownloading}
              isComplete={isDownloadComplete}
            />
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TicketHistoryInfo
