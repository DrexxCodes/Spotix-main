"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc } from "firebase/firestore"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { Search, Calendar, Shield, AlertCircle, CheckCircle, ArrowRight, Wallet, Users, DollarSign } from "lucide-react"
import "./Collabs.css"

interface CollaborationData {
  id: string
  eventId: string
  eventName: string
  eventImage?: string
  eventDate?: string
  ownerUid: string
  ownerName: string
  role: string
  uid: string
  ticketsSold?: number
  totalRevenue?: number
}

const Collabs = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [bookerId, setBookerId] = useState("")
  const [eventId, setEventId] = useState("")
  const [collaboratorId, setCollaboratorId] = useState("")
  const [searchResults, setSearchResults] = useState<CollaborationData | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    // Only check if user is authenticated, don't load any collaborations
    const checkAuth = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }
      } catch (error) {
        console.error("Authentication check error:", error)
      } finally {
        setInitialLoading(false)
      }
    }

    checkAuth()
  }, [navigate])

  const handleSearch = async () => {
    // Validate that all three fields are provided
    if (!bookerId || !eventId || !collaboratorId) {
      setErrorMessage("Please enter all three fields: Booker ID, Event ID, and Collaborator ID")
      return
    }

    setLoading(true)
    setErrorMessage("")
    setSuccessMessage("")
    setSearchResults(null)

    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      // Step 1: Check if the booker ID exists
      const bookerDocRef = doc(db, "users", bookerId)
      const bookerDoc = await getDoc(bookerDocRef)

      if (!bookerDoc.exists()) {
        setErrorMessage("Booker ID not found. Please check and try again.")
        setLoading(false)
        return
      }

      const bookerData = bookerDoc.data()

      // Step 2: Check if the event exists in the booker's userEvents collection
      const eventDocRef = doc(db, "events", bookerId, "userEvents", eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (!eventDoc.exists()) {
        setErrorMessage("Event not found for this Booker. Please check the Event ID and try again.")
        setLoading(false)
        return
      }

      const eventData = eventDoc.data()

      // Step 3: Check if the collaborator document exists in the event's collaborators collection
      const collaboratorDocRef = doc(db, "events", bookerId, "userEvents", eventId, "collaborators", collaboratorId)
      const collaboratorDoc = await getDoc(collaboratorDocRef)

      if (!collaboratorDoc.exists()) {
        setErrorMessage("Collaborator not found for this event. Please check the Collaborator ID and try again.")
        setLoading(false)
        return
      }

      const collaboratorData = collaboratorDoc.data()

      // In the handleSearch function, after retrieving collaboratorData, add this console log to debug:
      console.log("Collaborator role:", collaboratorData.role)

      // Step 4: Verify that the current user's UID matches the UID in the collaborator document
      if (collaboratorData.uid !== user.uid) {
        setErrorMessage("Access denied. You do not have permission to access this collaboration.")
        setLoading(false)
        return
      }

      // All checks passed, create the collaboration data object
      // Modify the role assignment in the collaborationResult object to normalize the role value:
      const normalizedRole = (collaboratorData.role || "").toLowerCase()
      const collaborationResult: CollaborationData = {
        id: collaboratorId,
        eventId: eventId,
        eventName: eventData.eventName || "Unnamed Event",
        eventImage: eventData.eventImage || "",
        eventDate: eventData.eventDate || "No date",
        ownerUid: bookerId,
        ownerName: bookerData.fullName || bookerData.username || "Unknown User",
        role: normalizedRole, // Store the normalized (lowercase) role
        uid: collaboratorData.uid,
        // Include ticket sales and revenue data for admin role
        ticketsSold: eventData.ticketsSold || 0,
        totalRevenue: eventData.totalRevenue || 0,
      }

      setSearchResults(collaborationResult)
      setSuccessMessage("Collaboration found! You have access to this event.")
    } catch (error) {
      console.error("Error searching collaboration:", error)
      setErrorMessage("An error occurred while searching. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTickets = () => {
    if (!searchResults) return

    // Debug log
    console.log("Navigating to verify tickets with state:", {
      collaborationId: searchResults.id,
      eventId: searchResults.eventId,
      eventName: searchResults.eventName,
      eventImage: searchResults.eventImage,
      ownerUid: searchResults.ownerUid,
      role: searchResults.role,
    })

    navigate("/collab-verify", {
      state: {
        collaborationId: searchResults.id,
        eventId: searchResults.eventId,
        eventName: searchResults.eventName,
        eventImage: searchResults.eventImage,
        ownerUid: searchResults.ownerUid,
        role: searchResults.role,
      },
    })
  }

  const handleManagePayouts = () => {
    if (!searchResults) return

    // Debug log
    console.log("Navigating to manage payouts with state:", {
      collaborationId: searchResults.id,
      eventId: searchResults.eventId,
      eventName: searchResults.eventName,
      eventImage: searchResults.eventImage,
      ownerUid: searchResults.ownerUid,
      role: searchResults.role,
    })

    navigate("/collab-payout", {
      state: {
        collaborationId: searchResults.id,
        eventId: searchResults.eventId,
        eventName: searchResults.eventName,
        eventImage: searchResults.eventImage,
        ownerUid: searchResults.ownerUid,
        role: searchResults.role,
      },
    })
  }

  const clearSearch = () => {
    setBookerId("")
    setEventId("")
    setCollaboratorId("")
    setSearchResults(null)
    setErrorMessage("")
    setSuccessMessage("")
  }

  if (initialLoading) {
    return <Preloader />
  }

  return (
    <>
      <BookersHeader />
      <div className="collabs-container">
        <h1 className="page-title">Event Collaborations</h1>

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={16} />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            <CheckCircle size={16} />
            <p>{successMessage}</p>
          </div>
        )}

        <div className="search-section">
          <h2>Search Collaborations</h2>
          <p>Enter all three fields below to access your collaboration</p>

          <div className="search-form">
            <div className="form-group">
              <label htmlFor="booker-id">
                Booker ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="booker-id"
                value={bookerId}
                onChange={(e) => setBookerId(e.target.value)}
                placeholder="Enter event owner's ID"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="event-id">
                Event ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="event-id"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Enter event ID"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="collaborator-id">
                Collaborator ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="collaborator-id"
                value={collaboratorId}
                onChange={(e) => setCollaboratorId(e.target.value)}
                placeholder="Enter collaborator ID"
                required
              />
            </div>

            <div className="search-actions">
              <button
                className="search-button"
                onClick={handleSearch}
                disabled={loading || !bookerId || !eventId || !collaboratorId}
              >
                {loading ? (
                  "Searching..."
                ) : (
                  <>
                    <Search size={16} />
                    Search
                  </>
                )}
              </button>

              <button className="clear-button" onClick={clearSearch} disabled={loading}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {searchResults && (
          <div className="search-results-section">
            <h2>Collaboration Details</h2>

            <div className="collaboration-card">
              <div className="collaboration-header">
                {searchResults.eventImage ? (
                  <img
                    src={searchResults.eventImage || "/placeholder.svg"}
                    alt={searchResults.eventName}
                    className="event-image"
                  />
                ) : (
                  <div className="event-image-placeholder">
                    <Calendar size={24} />
                  </div>
                )}
                <div className="event-info">
                  <h3>{searchResults.eventName}</h3>
                  <p className="event-date">{searchResults.eventDate}</p>
                </div>
              </div>

              <div className="collaboration-details">
                <div className="detail-row">
                  <span className="detail-label">Event Owner:</span>
                  <span className="detail-value">{searchResults.ownerName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Your Role:</span>
                  {/* Then update the role display in the UI to properly capitalize the role: */}
                  <span className={`role-badge role-${searchResults.role}`}>
                    {searchResults.role === "check-in" || searchResults.role === "checkin"
                      ? "Check-in"
                      : searchResults.role === "admin"
                        ? "Admin"
                        : searchResults.role === "accountant"
                          ? "Accountant"
                          : searchResults.role}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Collaboration ID:</span>
                  <span className="detail-value collab-id">{searchResults.id}</span>
                </div>

                {/* Show event stats for admin role */}
                {searchResults.role === "admin" && (
                  <div className="admin-stats">
                    <div className="stat-card">
                      <div className="stat-icon">
                        <Users size={20} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Tickets Sold</span>
                        <span className="stat-value">{searchResults.ticketsSold}</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">
                        <DollarSign size={20} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Total Revenue</span>
                        <span className="stat-value">₦{searchResults.totalRevenue?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Update the button conditional rendering to be more flexible with role names: */}
              <div className="collaboration-actions">
                {(searchResults.role === "check-in" ||
                  searchResults.role === "checkin" ||
                  searchResults.role === "admin") && (
                  <button className="verify-tickets-button" onClick={handleVerifyTickets}>
                    Verify Tickets
                    <ArrowRight size={16} />
                  </button>
                )}

                {(searchResults.role === "accountant" || searchResults.role === "admin") && (
                  <button className="manage-payouts-button" onClick={handleManagePayouts}>
                    Manage Payouts
                    <Wallet size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!searchResults && !loading && (
          <div className="no-collaborations">
            <Shield size={48} />
            <h3>No Collaboration Found</h3>
            <p>Enter the required information above to access your collaboration.</p>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default Collabs
