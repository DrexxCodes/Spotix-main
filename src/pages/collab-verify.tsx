"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, updateDoc, collection, query, where, getDocs, getDoc } from "firebase/firestore"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { CheckCircle, XCircle, AlertTriangle, Camera, User, Shield } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import "./collab-verify.css"

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

interface CollaborationInfo {
  collaborationId: string
  eventId: string
  eventName: string
  eventImage?: string
  ownerUid: string
  role: "admin" | "checkin" | "accountant"
}

const CollabVerify = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [ticketId, setTicketId] = useState("")
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "success" | "error" | "already-verified" | "not-found"
  >("idle")
  const [collaborationInfo, setCollaborationInfo] = useState<CollaborationInfo | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isScanning, setIsScanning] = useState(false)
  const [ownerName, setOwnerName] = useState<string>("")
  const [currentUserName, setCurrentUserName] = useState<string>("")

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const validateCollaboration = async () => {
      try {
        setInitialLoading(true)
        const user = auth.currentUser
        if (!user) {
          console.error("No authenticated user")
          navigate("/login")
          return
        }

        // Debug log the location state
        console.log("collab-verify received state:", location.state)

        // Check if we have collaboration info from location state
        if (!location.state?.collaborationId || !location.state?.eventId || !location.state?.ownerUid) {
          console.error("Missing required state properties", location.state)
          navigate("/collabs")
          return
        }

        // Set collaboration info from location state
        setCollaborationInfo({
          collaborationId: location.state.collaborationId,
          eventId: location.state.eventId,
          eventName: location.state.eventName || "Unknown Event",
          eventImage: location.state.eventImage || "",
          ownerUid: location.state.ownerUid,
          role: location.state.role || "checkin",
        })

        // Verify that the collaboration exists and user has access
        const collabDoc = await getDoc(
          doc(
            db,
            "events",
            location.state.ownerUid,
            "userEvents",
            location.state.eventId,
            "collaborators",
            location.state.collaborationId,
          ),
        )

        if (!collabDoc.exists()) {
          console.error("Collaboration document not found")
          navigate("/collabs")
          return
        }

        const collabData = collabDoc.data()
        if (collabData.uid !== user.uid) {
          console.error("User does not match collaboration")
          navigate("/collabs")
          return
        }

        // Verify that the user has the correct role for this page
        if (
          collabData.role.toLowerCase() !== "admin" &&
          collabData.role.toLowerCase() !== "checkin" &&
          collabData.role.toLowerCase() !== "check-in"
        ) {
          setErrorMessage(
            "You don't have permission to verify tickets. Only Admin and Check-in roles can access this feature.",
          )
          setTimeout(() => navigate("/collabs"), 3000)
          return
        }

        // Get owner name
        try {
          const ownerDoc = await getDoc(doc(db, "users", location.state.ownerUid))
          if (ownerDoc.exists()) {
            const ownerData = ownerDoc.data()
            setOwnerName(ownerData.fullName || ownerData.username || "Unknown User")
          }
        } catch (error) {
          console.error("Error fetching owner details:", error)
        }

        // Get current user name
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setCurrentUserName(userData.fullName || userData.username || "Unknown User")
          }
        } catch (error) {
          console.error("Error fetching user details:", error)
        }
      } catch (error) {
        console.error("Error validating collaboration:", error)
        navigate("/collabs")
      } finally {
        setInitialLoading(false)
      }
    }

    validateCollaboration()
  }, [location.state, navigate])

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
    if (!scannedTicketId || !collaborationInfo) return

    setLoading(true)
    setVerificationStatus("idle")
    setErrorMessage("")

    try {
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      // Check if the ticket exists in the attendees collection for this event
      const attendeesCollectionRef = collection(
        db,
        "events",
        collaborationInfo.ownerUid,
        "userEvents",
        collaborationInfo.eventId,
        "attendees",
      )

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
          eventId: collaborationInfo.eventId,
          eventName: collaborationInfo.eventName,
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
          verifiedBy: user.uid,
          verifierName: currentUserName,
          verifierRole: "Collaborator",
        })

        // Also update the verification status in the user's ticket history
        if (ticketDocData.uid) {
          await updateTicketHistoryVerification(ticketDocData.uid, ticketDocData.ticketReference || "")
        }

        setTicketData({
          id: scannedTicketId,
          eventId: collaborationInfo.eventId,
          eventName: collaborationInfo.eventName,
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

  const handleBackToCollabs = () => {
    navigate("/collabs")
  }

  if (initialLoading) {
    return <Preloader />
  }

  return (
    <>
      <BookersHeader />
      <div className="collab-verify-container">
        <div className="collab-verify-header">
          <button className="back-button" onClick={handleBackToCollabs}>
            ← Back to Collaborations
          </button>
          <h1>Verify Tickets</h1>
        </div>

        {collaborationInfo && (
          <div className="event-collaboration-info">
            <div className="event-info">
              {collaborationInfo.eventImage ? (
                <img
                  src={collaborationInfo.eventImage || "/placeholder.svg"}
                  alt={collaborationInfo.eventName}
                  className="event-image"
                />
              ) : (
                <div className="event-image-placeholder">
                  <User size={24} />
                </div>
              )}
              <div>
                <h2>{collaborationInfo.eventName}</h2>
                <p className="event-owner">Event by: {ownerName}</p>
              </div>
            </div>

            <div className="collaborator-info">
              <div className="collaborator-avatar">
                <User size={20} />
              </div>
              <div>
                <p className="collaborator-name">{currentUserName}</p>
                <span className={`role-badge role-${collaborationInfo.role.toLowerCase()}`}>
                  {collaborationInfo.role === "admin"
                    ? "Admin"
                    : collaborationInfo.role === "checkin"
                      ? "Check-in"
                      : collaborationInfo.role === "accountant"
                        ? "Accountant"
                        : collaborationInfo.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {verificationStatus === "idle" && (
          <div className="verification-form">
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
                <button className="scan-qr-button" onClick={startScanner} title="Scan QR Code">
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <button className="verify-button" onClick={handleVerifyTicket} disabled={!ticketId.trim() || loading}>
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

            <div className="verification-note">
              <Shield size={16} />
              <p>Verified as collaborator for {ownerName}</p>
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

export default CollabVerify
