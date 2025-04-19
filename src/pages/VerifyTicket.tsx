"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { CheckCircle, XCircle, AlertTriangle, Camera } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"

interface TicketData {
  id: string
  eventId: string
  eventName: string
  attendeeName: string
  attendeeEmail: string
  ticketType: string
  purchaseDate: string
  purchaseTime: string
  isVerified: boolean
  ticketReference: string
}

interface EventOption {
  id: string
  name: string
}

const VerifyTicket = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [ticketId, setTicketId] = useState("")
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "success" | "error" | "already-verified" | "not-found"
  >("idle")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(location.state?.eventId || null)
  const [bookerEvents, setBookerEvents] = useState<EventOption[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isScanning, setIsScanning] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchBookerEvents = async () => {
      try {
        const user = auth.currentUser
        if (!user) return

        // Fetch events from the user's events collection
        const eventsCollectionRef = collection(db, "events", user.uid, "userEvents")
        const eventsSnapshot = await getDocs(eventsCollectionRef)

        const events: EventOption[] = []
        eventsSnapshot.forEach((doc) => {
          const data = doc.data()
          events.push({
            id: doc.id,
            name: data.eventName || "Unnamed Event",
          })
        })

        setBookerEvents(events)

        // If we have an event name from location state, find and select that event
        if (location.state?.eventName) {
          const matchingEvent = events.find((event) => event.name === location.state.eventName)
          if (matchingEvent) {
            setSelectedEventId(matchingEvent.id)
          }
        }
      } catch (error) {
        console.error("Error fetching booker events:", error)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchBookerEvents()
  }, [location.state])

  // Clean up scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch((error) => {
          console.log("Scanner was already stopped when unmounting")
        })
        scannerRef.current = null
      }
    }
  }, [])

  const handleTicketIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketId(e.target.value)
    // Reset verification status when ticket ID changes
    setVerificationStatus("idle")
    setTicketData(null)
    setErrorMessage("")
  }

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEventId(e.target.value)
    setVerificationStatus("idle")
    setTicketData(null)
    setErrorMessage("")
  }

  const updateTicketHistoryVerification = async (attendeeUid: string, ticketReference: string) => {
    try {
      // Find the ticket in the user's ticket history
      const ticketHistoryRef = collection(db, "TicketHistory", attendeeUid, "tickets")
      const ticketQuery = query(ticketHistoryRef, where("ticketReference", "==", ticketReference))
      const ticketSnapshot = await getDocs(ticketQuery)

      if (!ticketSnapshot.empty) {
        const ticketDoc = ticketSnapshot.docs[0]
        // Update the verified status
        await updateDoc(doc(ticketHistoryRef, ticketDoc.id), {
          verified: true,
        })
        console.log("Updated ticket history verification status")
      }
    } catch (error) {
      console.error("Error updating ticket history verification:", error)
    }
  }

  const verifyTicket = async (scannedTicketId: string) => {
    if (!scannedTicketId || !selectedEventId) return

    setLoading(true)
    setVerificationStatus("idle")
    setErrorMessage("")

    try {
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      // Check if the ticket exists in the attendees collection for this event
      const attendeesCollectionRef = collection(db, "events", user.uid, "userEvents", selectedEventId, "attendees")

      // First try to find by ticketId
      let ticketQuery = query(attendeesCollectionRef, where("ticketId", "==", scannedTicketId))
      let ticketSnapshot = await getDocs(ticketQuery)

      // If not found by ticketId, try by ticketReference
      if (ticketSnapshot.empty) {
        ticketQuery = query(attendeesCollectionRef, where("ticketReference", "==", scannedTicketId))
        ticketSnapshot = await getDocs(ticketQuery)
      }

      if (ticketSnapshot.empty) {
        // Ticket not found for this event
        setVerificationStatus("not-found")
        setErrorMessage("This ticket ID or reference is not associated with this event.")
        setLoading(false)
        return
      }

      // Ticket found in database
      const ticketDoc = ticketSnapshot.docs[0]
      const ticketDocData = ticketDoc.data()

      if (ticketDocData.verified) {
        // Ticket is already verified
        setTicketData({
          id: scannedTicketId,
          eventId: selectedEventId,
          eventName: bookerEvents.find((event) => event.id === selectedEventId)?.name || "Unknown Event",
          attendeeName: ticketDocData.fullName || "Unknown",
          attendeeEmail: ticketDocData.email || "unknown@example.com",
          ticketType: ticketDocData.ticketType || "Standard",
          purchaseDate: ticketDocData.purchaseDate || "Unknown",
          purchaseTime: ticketDocData.purchaseTime || "Unknown",
          isVerified: true,
          ticketReference: ticketDocData.ticketReference || "",
        })
        setVerificationStatus("already-verified")
      } else {
        // Ticket is valid but not yet verified
        // Update the ticket status to verified
        await updateDoc(doc(attendeesCollectionRef, ticketDoc.id), {
          verified: true,
          verificationDate: new Date().toLocaleDateString(),
          verificationTime: new Date().toLocaleTimeString(),
        })

        // Also update the verification status in the user's ticket history
        if (ticketDocData.uid) {
          await updateTicketHistoryVerification(ticketDocData.uid, ticketDocData.ticketReference || "")
        }

        setTicketData({
          id: scannedTicketId,
          eventId: selectedEventId,
          eventName: bookerEvents.find((event) => event.id === selectedEventId)?.name || "Unknown Event",
          attendeeName: ticketDocData.fullName || "Unknown",
          attendeeEmail: ticketDocData.email || "unknown@example.com",
          ticketType: ticketDocData.ticketType || "Standard",
          purchaseDate: ticketDocData.purchaseDate || "Unknown",
          purchaseTime: ticketDocData.purchaseTime || "Unknown",
          isVerified: false, // It was false before we updated it
          ticketReference: ticketDocData.ticketReference || "",
        })
        setVerificationStatus("success")
      }
    } catch (error) {
      console.error("Error verifying ticket:", error)
      setVerificationStatus("error")
      setErrorMessage("An error occurred while verifying the ticket. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTicket = () => {
    verifyTicket(ticketId)
  }

  const handleScanAgain = () => {
    setTicketId("")
    setTicketData(null)
    setVerificationStatus("idle")
    setErrorMessage("")
  }

  const startScanner = () => {
    if (!selectedEventId) {
      alert("Please select an event first")
      return
    }

    setIsScanning(true)

    // Initialize scanner in the next tick to ensure DOM is ready
    setTimeout(() => {
      if (scannerContainerRef.current) {
        // Make sure we don't have an existing scanner
        if (scannerRef.current) {
          try {
            // Only try to stop if it's running
            scannerRef.current.stop().catch((err) => {
              console.log("Scanner was already stopped or not initialized")
            })
            scannerRef.current = null
          } catch (err) {
            console.log("Error handling existing scanner:", err)
          }
        }

        // Create a new scanner instance
        const html5QrCode = new Html5Qrcode("scanner-container")
        scannerRef.current = html5QrCode

        html5QrCode
          .start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
            },
            async (decodedText) => {
              // Success callback
              console.log(`QR Code detected: ${decodedText}`)

              // Stop the scanner immediately
              try {
                await html5QrCode.stop()
                scannerRef.current = null
                setIsScanning(false)

                // Set the ticket ID
                setTicketId(decodedText)

                // Verify the ticket directly
                verifyTicket(decodedText)
              } catch (err) {
                console.error("Error in QR code processing:", err)
              }
            },
            (errorMessage) => {
              // Error callback - we don't need to show these to the user
              console.log(`QR Code scanning error: ${errorMessage}`)
            },
          )
          .catch((err) => {
            console.error("Error starting scanner:", err)
            setIsScanning(false)
            setErrorMessage("Could not access camera. Please check permissions and try again.")
          })
      }
    }, 100)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null
          setIsScanning(false)
        })
        .catch((err) => {
          console.log("Scanner was already stopped")
          scannerRef.current = null
          setIsScanning(false)
        })
    } else {
      setIsScanning(false)
    }
  }

  if (initialLoading) {
    return <Preloader />
  }

  return (
    <>
      <UserHeader />
      <div className="verify-ticket-container">
        <h1>Verify Ticket</h1>

        {verificationStatus === "idle" && (
          <div className="verification-form">
            <div className="form-group">
              <label htmlFor="event-select">Select Event</label>
              <select
                id="event-select"
                value={selectedEventId || ""}
                onChange={handleEventChange}
                className="event-select"
                required
              >
                <option value="">-- Select an event --</option>
                {bookerEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ticket-id">Enter Ticket ID or Reference</label>
              <div className="ticket-input-container">
                <input
                  type="text"
                  id="ticket-id"
                  value={ticketId}
                  onChange={handleTicketIdChange}
                  placeholder="e.g., TICKET123 or REF456"
                  className="ticket-id-input"
                  required
                />
                <button
                  className="scan-qr-button"
                  onClick={startScanner}
                  disabled={!selectedEventId}
                  title={!selectedEventId ? "Please select an event first" : "Scan QR Code"}
                >
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <button
              className="verify-button"
              onClick={handleVerifyTicket}
              disabled={!ticketId.trim() || !selectedEventId || loading}
            >
              {loading ? "Verifying..." : "Verify Ticket"}
            </button>

            {isScanning && (
              <div className="scanner-overlay">
                <div className="scanner-container">
                  <div className="scanner-header">
                    <h3>Scan Spotix Ticket QR Code</h3>
                    <button className="close-scanner-button" onClick={stopScanner}>
                      ×
                    </button>
                  </div>
                  <div className="qr-scanner">
                    <div id="scanner-container" ref={scannerContainerRef}></div>
                    <div className="scanner-frame">
                      <div className="scanner-corner scanner-corner-top-left"></div>
                      <div className="scanner-corner scanner-corner-top-right"></div>
                      <div className="scanner-corner scanner-corner-bottom-left"></div>
                      <div className="scanner-corner scanner-corner-bottom-right"></div>
                    </div>
                    <div className="scan-animation">
                      <div className="scan-line"></div>
                    </div>
                  </div>
                  <p className="scanner-instructions">Position the QR code within the frame to scan</p>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && <Preloader loading={loading} />}

        {verificationStatus === "success" && ticketData && (
          <div className="verification-result success">
            <div className="result-icon success-icon">
              <CheckCircle size={24} />
            </div>
            <h2>Ticket Verified Successfully!</h2>

            <div className="ticket-details">
              <div className="detail-row">
                <span className="detail-label">Ticket ID:</span>
                <span className="detail-value">{ticketData.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Reference:</span>
                <span className="detail-value">{ticketData.ticketReference}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Event:</span>
                <span className="detail-value">{ticketData.eventName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Attendee:</span>
                <span className="detail-value">{ticketData.attendeeName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{ticketData.attendeeEmail}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Ticket Type:</span>
                <span className="detail-value">{ticketData.ticketType}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Purchase Date:</span>
                <span className="detail-value">{ticketData.purchaseDate}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Purchase Time:</span>
                <span className="detail-value">{ticketData.purchaseTime}</span>
              </div>
            </div>

            <button className="scan-again-button" onClick={handleScanAgain}>
              Scan Another Ticket
            </button>
          </div>
        )}

        {verificationStatus === "already-verified" && ticketData && (
          <div className="verification-result already-verified">
            <div className="result-icon warning-icon">
              <AlertTriangle size={24} />
            </div>
            <h2>Ticket Already Verified</h2>

            <div className="ticket-details">
              <div className="detail-row">
                <span className="detail-label">Ticket ID:</span>
                <span className="detail-value">{ticketData.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Reference:</span>
                <span className="detail-value">{ticketData.ticketReference}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Event:</span>
                <span className="detail-value">{ticketData.eventName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Attendee:</span>
                <span className="detail-value">{ticketData.attendeeName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{ticketData.attendeeEmail}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Ticket Type:</span>
                <span className="detail-value">{ticketData.ticketType}</span>
              </div>
            </div>

            <p className="warning-message">
              This ticket has already been verified. Please check with the attendee or event manager.
            </p>

            <button className="scan-again-button" onClick={handleScanAgain}>
              Scan Another Ticket
            </button>
          </div>
        )}

        {verificationStatus === "not-found" && (
          <div className="verification-result error">
            <div className="result-icon error-icon">
              <XCircle size={24} />
            </div>
            <h2>Ticket Not Found</h2>
            <p className="error-message">
              {errorMessage || "The ticket ID or reference you entered is not associated with this event."}
            </p>

            <button className="scan-again-button" onClick={handleScanAgain}>
              Try Again
            </button>
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="verification-result error">
            <div className="result-icon error-icon">
              <XCircle size={24} />
            </div>
            <h2>Verification Error</h2>
            <p className="error-message">
              {errorMessage || "An error occurred while verifying the ticket. Please try again."}
            </p>

            <button className="scan-again-button" onClick={handleScanAgain}>
              Try Again
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default VerifyTicket
