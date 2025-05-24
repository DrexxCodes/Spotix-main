"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, Timestamp, setDoc } from "firebase/firestore"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import {
  Users,
  Search,
  UserPlus,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Trash2,
  Edit,
  Check,
  X,
  Info,
  Shield,
  ToggleLeft,
  ToggleRight,
  Settings,
  ArrowLeft,
} from "lucide-react"
import "./team.css"

interface EventOption {
  id: string
  name: string
  enabledCollaboration?: boolean
  allowAgents?: boolean
}

interface Collaborator {
  id: string
  uid: string
  name: string
  email: string
  role: "Admin" | "Check-in" | "Accountant"
  eventId: string
  eventName: string
  dateAdded: string
}

interface SearchedUser {
  uid: string
  username: string
  email: string
  fullName: string
  profilePicture?: string
  isVerified: boolean
  isBooker?: boolean
}

const Team = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventOption[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [selectedEventName, setSelectedEventName] = useState<string>("")
  const [selectedEventCollaboration, setSelectedEventCollaboration] = useState<boolean>(false)
  const [allowAgents, setAllowAgents] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([])
  const [searching, setSearching] = useState<boolean>(false)
  const [userToAdd, setUserToAdd] = useState<SearchedUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<"Admin" | "Check-in" | "Accountant">("Check-in")
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [isCollaborationEnabled, setIsCollaborationEnabled] = useState<boolean>(false)
  const [showRoleInfo, setShowRoleInfo] = useState<string | null>(null)
  const [editingCollaborator, setEditingCollaborator] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<"Admin" | "Check-in" | "Accountant">("Check-in")
  const [updatingEventCollaboration, setUpdatingEventCollaboration] = useState<boolean>(false)
  const [updatingAgentActivity, setUpdatingAgentActivity] = useState<boolean>(false)
  const [configureMode, setConfigureMode] = useState<boolean>(false)
  const [uidSearchTerm, setUidSearchTerm] = useState<string>("")
  const [uidSearching, setUidSearching] = useState<boolean>(false)
  const [uidSearchError, setUidSearchError] = useState<string | null>(null)
  const [foundUser, setFoundUser] = useState<SearchedUser | null>(null)
  const [bookerName, setBookerName] = useState<string>("")

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        // Get booker name
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setBookerName(userData.fullName || userData.username || "Unknown User")
          setIsCollaborationEnabled(userData.enabledCollaboration === true)
        }

        // Fetch events from the user's events collection
        const eventsCollectionRef = collection(db, "events", user.uid, "userEvents")
        const eventsSnapshot = await getDocs(eventsCollectionRef)

        const eventsData: EventOption[] = []
        eventsSnapshot.forEach((doc) => {
          const data = doc.data()
          eventsData.push({
            id: doc.id,
            name: data.eventName || "Unnamed Event",
            enabledCollaboration: data.enabledCollaboration === true,
            allowAgents: data.allowAgents === true,
          })
        })

        setEvents(eventsData)

        // Initialize with the first event if available
        if (eventsData.length > 0) {
          setSelectedEventId(eventsData[0].id)
          setSelectedEventName(eventsData[0].name)
          setSelectedEventCollaboration(eventsData[0].enabledCollaboration === true)
          setAllowAgents(eventsData[0].allowAgents === true)
          await fetchCollaborators(user.uid, eventsData[0].id)
        }
      } catch (error) {
        console.error("Error fetching events:", error)
        setErrorMessage("Failed to load events. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [navigate])

  const fetchCollaborators = async (ownerUid: string, eventId: string) => {
    try {
      // First check if the event has collaborators collection
      const eventCollaboratorsRef = collection(db, "events", ownerUid, "userEvents", eventId, "collaborators")
      const collaboratorsSnapshot = await getDocs(eventCollaboratorsRef)

      const collaboratorsData: Collaborator[] = []
      for (const collabDoc of collaboratorsSnapshot.docs) {
        const collabData = collabDoc.data()

        // Fetch user info for each collaborator
        try {
          const userDoc = await getDoc(doc(db, "users", collabData.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()

            collaboratorsData.push({
              id: collabDoc.id,
              uid: collabData.uid,
              name: userData.fullName || userData.username || "Unknown User",
              email: userData.email || "No email",
              role: collabData.role || "Check-in",
              eventId: eventId,
              eventName: selectedEventName,
              dateAdded: collabData.dateAdded
                ? new Date(collabData.dateAdded.seconds * 1000).toLocaleDateString()
                : new Date().toLocaleDateString(),
            })
          }
        } catch (error) {
          console.error("Error fetching user data for collaborator:", error)
        }
      }

      setCollaborators(collaboratorsData)
    } catch (error) {
      console.error("Error fetching collaborators:", error)
      setErrorMessage("Failed to load collaborators. Please try again.")
    }
  }

  const handleEventChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value
    setSelectedEventId(eventId)
    setConfigureMode(false)

    const selectedEvent = events.find((event) => event.id === eventId)
    setSelectedEventName(selectedEvent?.name || "")
    setSelectedEventCollaboration(selectedEvent?.enabledCollaboration === true)
    setAllowAgents(selectedEvent?.allowAgents === true)

    if (eventId) {
      const user = auth.currentUser
      if (user) {
        await fetchCollaborators(user.uid, eventId)
      }
    } else {
      setCollaborators([])
    }
  }

  const handleToggleEventCollaboration = async () => {
    if (!selectedEventId) return

    try {
      setUpdatingEventCollaboration(true)
      setErrorMessage("")

      const user = auth.currentUser
      if (!user) return

      // Update the event document
      const eventDocRef = doc(db, "events", user.uid, "userEvents", selectedEventId)
      await updateDoc(eventDocRef, {
        enabledCollaboration: !selectedEventCollaboration,
      })

      // Update local state
      setSelectedEventCollaboration(!selectedEventCollaboration)
      setEvents(
        events.map((event) =>
          event.id === selectedEventId ? { ...event, enabledCollaboration: !selectedEventCollaboration } : event,
        ),
      )

      setSuccessMessage(`Collaboration ${!selectedEventCollaboration ? "enabled" : "disabled"} for this event.`)
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error updating event collaboration:", error)
      setErrorMessage("Failed to update event collaboration. Please try again.")
    } finally {
      setUpdatingEventCollaboration(false)
    }
  }

  const handleToggleAgentActivity = async () => {
    if (!selectedEventId) return

    try {
      setUpdatingAgentActivity(true)
      setErrorMessage("")

      const user = auth.currentUser
      if (!user) return

      // Update the event document
      const eventDocRef = doc(db, "events", user.uid, "userEvents", selectedEventId)
      await updateDoc(eventDocRef, {
        allowAgents: !allowAgents,
      })

      // Update local state
      setAllowAgents(!allowAgents)
      setEvents(events.map((event) => (event.id === selectedEventId ? { ...event, allowAgents: !allowAgents } : event)))

      setSuccessMessage(`Agent activity ${!allowAgents ? "enabled" : "disabled"} for this event.`)
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error updating agent activity:", error)
      setErrorMessage("Failed to update agent activity. Please try again.")
    } finally {
      setUpdatingAgentActivity(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    setErrorMessage("")

    try {
      const user = auth.currentUser
      if (!user) return

      // Search for users by email or username
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      const results: SearchedUser[] = []
      usersSnapshot.forEach((doc) => {
        if (doc.id !== user.uid) {
          // Don't include the current user
          const userData = doc.data()

          // Search by email, username, or fullName
          if (
            (userData.email && userData.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (userData.username && userData.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (userData.fullName && userData.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
          ) {
            results.push({
              uid: doc.id,
              username: userData.username || "No username",
              email: userData.email || "No email",
              fullName: userData.fullName || userData.username || "Unknown User",
              profilePicture: userData.profilePicture,
              isVerified: userData.isVerified || false,
              isBooker: userData.isBooker === true,
            })
          }
        }
      })

      setSearchResults(results)

      if (results.length === 0) {
        setErrorMessage("No users found with that email or username.")
      }
    } catch (error) {
      console.error("Error searching for users:", error)
      setErrorMessage("An error occurred while searching for users.")
    } finally {
      setSearching(false)
    }
  }

  const handleSelectUser = (user: SearchedUser) => {
    if (!user.isBooker) {
      setErrorMessage(
        `${user.username} is not a booker. They need to activate a booker account to be added as a collaborator.`,
      )
      return
    }

    setUserToAdd(user)
    setSearchResults([])
    setSearchTerm("")
  }

  // Function to send email notification
  const sendTeamMemberNotification = async (
    collaborationId: string,
    eventId: string,
    bookerId: string,
    userRole: string,
    eventName: string,
    bookerName: string,
    username: string,
    email: string,
    recipientName: string,
  ) => {
    try {
      const response = await fetch("https://spotix-backend.onrender.com/api/notify/team-member-added", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collaborationId,
          eventId,
          bookerId,
          userRole,
          eventName,
          bookerName,
          username,
          email,
          recipientName,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        console.error("Failed to send notification email:", data.message)
      } else {
        console.log("Notification email sent successfully")
      }
    } catch (error) {
      console.error("Error sending notification email:", error)
    }
  }

  const handleAddCollaborator = async () => {
    if (!userToAdd || !selectedEventId || !selectedRole) {
      setErrorMessage("Please select a user, event, and role.")
      return
    }

    setIsAddingUser(true)
    setErrorMessage("")

    try {
      const user = auth.currentUser
      if (!user) return

      // Check if this user is already a collaborator for this event
      const existingCollaborator = collaborators.find((c) => c.uid === userToAdd.uid)
      if (existingCollaborator) {
        setErrorMessage("This user is already a collaborator for this event.")
        setIsAddingUser(false)
        return
      }

      // Add to event's collaborators collection
      const collaboratorsRef = collection(db, "events", user.uid, "userEvents", selectedEventId, "collaborators")
      const newCollaboration = {
        uid: userToAdd.uid,
        role: selectedRole,
        dateAdded: Timestamp.now(),
      }

      const docRef = await addDoc(collaboratorsRef, newCollaboration)

      // Add to collaborations collection for the collaborator
      const collaborationDocRef = doc(db, "collaborations", userToAdd.uid)
      const collaborationDoc = await getDoc(collaborationDocRef)

      if (collaborationDoc.exists()) {
        // Update existing document
        const collaborationData = collaborationDoc.data()
        const events = collaborationData.events || []
        events.push({
          eventId: selectedEventId,
          ownerId: user.uid,
          role: selectedRole,
          addedAt: Timestamp.now(),
        })
        await updateDoc(collaborationDocRef, { events })
      } else {
        // Create new document
        await setDoc(collaborationDocRef, {
          events: [
            {
              eventId: selectedEventId,
              ownerId: user.uid,
              role: selectedRole,
              addedAt: Timestamp.now(),
            },
          ],
        })
      }

      // Add to local state
      setCollaborators([
        ...collaborators,
        {
          id: docRef.id,
          uid: userToAdd.uid,
          name: userToAdd.fullName || userToAdd.username || "Unknown User",
          email: userToAdd.email || "No email",
          role: selectedRole,
          eventId: selectedEventId,
          eventName: selectedEventName,
          dateAdded: new Date().toLocaleDateString(),
        },
      ])

      // Send email notification
      await sendTeamMemberNotification(
        docRef.id,
        selectedEventId,
        user.uid,
        selectedRole,
        selectedEventName,
        bookerName,
        userToAdd.username,
        userToAdd.email,
        userToAdd.fullName || userToAdd.username,
      )

      setUserToAdd(null)
      setSelectedRole("Check-in")
      setSuccessMessage("Collaborator added successfully!")

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error adding collaborator:", error)
      setErrorMessage("Failed to add collaborator. Please try again.")
    } finally {
      setIsAddingUser(false)
    }
  }

  const handleCancelAddUser = () => {
    setUserToAdd(null)
    setSelectedRole("Check-in")
  }

  const handleRemoveCollaborator = async (collaboratorId: string, collaboratorUid: string) => {
    try {
      const user = auth.currentUser
      if (!user) return

      // Delete from event's collaborators collection
      const collaboratorDocRef = doc(
        db,
        "events",
        user.uid,
        "userEvents",
        selectedEventId,
        "collaborators",
        collaboratorId,
      )
      await deleteDoc(collaboratorDocRef)

      // Update collaborations collection for the collaborator
      const collaborationDocRef = doc(db, "collaborations", collaboratorUid)
      const collaborationDoc = await getDoc(collaborationDocRef)

      if (collaborationDoc.exists()) {
        const collaborationData = collaborationDoc.data()
        const events = collaborationData.events || []
        const updatedEvents = events.filter(
          (event: any) => !(event.eventId === selectedEventId && event.ownerId === user.uid),
        )
        await updateDoc(collaborationDocRef, { events: updatedEvents })
      }

      // Update local state
      setCollaborators(collaborators.filter((c) => c.id !== collaboratorId))

      setSuccessMessage("Collaborator removed successfully!")
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error removing collaborator:", error)
      setErrorMessage("Failed to remove collaborator. Please try again.")
    }
  }

  const handleEditRole = (collaboratorId: string, currentRole: "Admin" | "Check-in" | "Accountant") => {
    setEditingCollaborator(collaboratorId)
    setEditingRole(currentRole)
  }

  const handleSaveRole = async (collaboratorId: string, collaboratorUid: string) => {
    try {
      const user = auth.currentUser
      if (!user) return

      // Update in event's collaborators collection
      const collaboratorDocRef = doc(
        db,
        "events",
        user.uid,
        "userEvents",
        selectedEventId,
        "collaborators",
        collaboratorId,
      )
      await updateDoc(collaboratorDocRef, {
        role: editingRole,
      })

      // Update in collaborations collection for the collaborator
      const collaborationDocRef = doc(db, "collaborations", collaboratorUid)
      const collaborationDoc = await getDoc(collaborationDocRef)

      if (collaborationDoc.exists()) {
        const collaborationData = collaborationDoc.data()
        const events = collaborationData.events || []
        const updatedEvents = events.map((event: any) => {
          if (event.eventId === selectedEventId && event.ownerId === user.uid) {
            return { ...event, role: editingRole }
          }
          return event
        })
        await updateDoc(collaborationDocRef, { events: updatedEvents })
      }

      // Update local state
      setCollaborators(collaborators.map((c) => (c.id === collaboratorId ? { ...c, role: editingRole } : c)))

      setEditingCollaborator(null)

      setSuccessMessage("Role updated successfully!")
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error updating collaborator role:", error)
      setErrorMessage("Failed to update role. Please try again.")
    }
  }

  const handleNavigateToProfile = () => {
    navigate("/bookerprofile")
  }

  const handleConfigureEvent = () => {
    setConfigureMode(true)
    setUidSearchTerm("")
    setFoundUser(null)
    setUidSearchError(null)
  }

  const handleBackToEvents = () => {
    setConfigureMode(false)
  }

  const handleUidSearch = async () => {
    if (!uidSearchTerm.trim()) {
      setUidSearchError("Please enter a user ID")
      return
    }

    setUidSearching(true)
    setUidSearchError(null)
    setFoundUser(null)

    try {
      // Check if the UID exists
      const userDocRef = doc(db, "users", uidSearchTerm.trim())
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        setUidSearchError("Invalid user ID. User not found.")
        return
      }

      const userData = userDoc.data()

      // Check if user is already a collaborator
      const isExistingCollaborator = collaborators.some((c) => c.uid === uidSearchTerm.trim())
      if (isExistingCollaborator) {
        setUidSearchError("This user is already a collaborator for this event.")
        return
      }

      // Check if user is a booker
      if (userData.isBooker !== true) {
        setUidSearchError(
          `${userData.username || "This user"} is not a booker. Please inform them to activate a booker account to be added as a collaborator.`,
        )
        return
      }

      // User found and is a booker
      setFoundUser({
        uid: uidSearchTerm.trim(),
        username: userData.username || "No username",
        email: userData.email || "No email",
        fullName: userData.fullName || userData.username || "Unknown User",
        profilePicture: userData.profilePicture,
        isVerified: userData.isVerified || false,
        isBooker: true,
      })
    } catch (error) {
      console.error("Error searching for user by UID:", error)
      setUidSearchError("An error occurred while searching for the user.")
    } finally {
      setUidSearching(false)
    }
  }

  const handleAddFoundUser = async () => {
    if (!foundUser || !selectedEventId || !selectedRole) {
      setUidSearchError("Please select a role for this user.")
      return
    }

    setIsAddingUser(true)
    setUidSearchError(null)

    try {
      const user = auth.currentUser
      if (!user) return

      // Add to event's collaborators collection
      const collaboratorsRef = collection(db, "events", user.uid, "userEvents", selectedEventId, "collaborators")
      const newCollaboration = {
        uid: foundUser.uid,
        role: selectedRole,
        dateAdded: Timestamp.now(),
      }

      const docRef = await addDoc(collaboratorsRef, newCollaboration)

      // Add to collaborations collection for the collaborator
      const collaborationDocRef = doc(db, "collaborations", foundUser.uid)
      const collaborationDoc = await getDoc(collaborationDocRef)

      if (collaborationDoc.exists()) {
        // Update existing document
        const collaborationData = collaborationDoc.data()
        const events = collaborationData.events || []
        events.push({
          eventId: selectedEventId,
          ownerId: user.uid,
          role: selectedRole,
          addedAt: Timestamp.now(),
        })
        await updateDoc(collaborationDocRef, { events })
      } else {
        // Create new document
        await setDoc(collaborationDocRef, {
          events: [
            {
              eventId: selectedEventId,
              ownerId: user.uid,
              role: selectedRole,
              addedAt: Timestamp.now(),
            },
          ],
        })
      }

      // Add to local state
      setCollaborators([
        ...collaborators,
        {
          id: docRef.id,
          uid: foundUser.uid,
          name: foundUser.fullName || foundUser.username || "Unknown User",
          email: foundUser.email || "No email",
          role: selectedRole,
          eventId: selectedEventId,
          eventName: selectedEventName,
          dateAdded: new Date().toLocaleDateString(),
        },
      ])

      // Send email notification
      await sendTeamMemberNotification(
        docRef.id,
        selectedEventId,
        user.uid,
        selectedRole,
        selectedEventName,
        bookerName,
        foundUser.username,
        foundUser.email,
        foundUser.fullName || foundUser.username,
      )

      setFoundUser(null)
      setUidSearchTerm("")
      setSelectedRole("Check-in")
      setSuccessMessage("Collaborator added successfully!")

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error adding collaborator:", error)
      setUidSearchError("Failed to add collaborator. Please try again.")
    } finally {
      setIsAddingUser(false)
    }
  }

  if (loading) {
    return <Preloader />
  }

  // Display a message if collaboration is disabled at the user level
  if (!isCollaborationEnabled) {
    return (
      <>
        <BookersHeader />
        <div className="team-container">
          <div className="team-header">
            <div className="team-title">
              <Users className="team-icon" />
              <h1>Team Collaboration</h1>
            </div>
          </div>

          <div className="collaboration-disabled-message">
            <AlertCircle size={32} />
            <h2>Collaboration is currently disabled</h2>
            <p>
              You need to enable collaboration in your profile settings before you can add team members to your events.
            </p>
            <button onClick={handleNavigateToProfile} className="enable-collaboration-button">
              Go to Profile Settings
            </button>
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
        <title>Team Collaboration - Spotix Booker</title>
        <meta name="description" content="Manage your event team and collaborators on Spotix Booker." />
      </Helmet>
      <div className="team-container">
        <div className="team-header">
          <div className="team-title">
            <Users className="team-icon" />
            <h1>Team Collaboration</h1>
          </div>
        </div>

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={16} />
            <p>{errorMessage}</p>
            <button onClick={() => setErrorMessage("")} className="close-error">
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            <CheckCircle size={16} />
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage("")} className="close-success">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="team-content">
          {configureMode ? (
            // Configure Mode - UID Search and Team Member Addition
            <div className="configure-mode">
              <div className="configure-header">
                <button onClick={handleBackToEvents} className="back-button">
                  <ArrowLeft size={16} />
                  Back to Events
                </button>
                <h2>Configure Team for {selectedEventName}</h2>
              </div>

              <div className="uid-search-section">
                <h3>Add Team Member by User ID</h3>
                <p>Enter the User ID of the team member you want to add to this event.</p>

                <div className="uid-search-container">
                  <div className="uid-search-input-container">
                    <input
                      type="text"
                      placeholder="Enter User ID..."
                      value={uidSearchTerm}
                      onChange={(e) => setUidSearchTerm(e.target.value)}
                      className="uid-search-input"
                    />
                    <button
                      onClick={handleUidSearch}
                      disabled={uidSearching || !uidSearchTerm.trim()}
                      className="uid-search-button"
                    >
                      {uidSearching ? "Searching..." : <Search size={18} />}
                    </button>
                  </div>

                  {uidSearchError && <div className="uid-search-error">{uidSearchError}</div>}

                  {foundUser && (
                    <div className="found-user-container">
                      <div className="found-user-header">
                        <h4>Team Member Found</h4>
                      </div>
                      <div className="found-user-info">
                        <div className="user-avatar">
                          <img
                            src={foundUser.profilePicture || "/placeholder.svg?height=40&width=40"}
                            alt={foundUser.username}
                          />
                          {foundUser.isVerified && <span className="verified-badge">✓</span>}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{foundUser.fullName}</div>
                          <div className="user-username">@{foundUser.username}</div>
                          <div className="user-email">{foundUser.email}</div>
                        </div>
                      </div>

                      <div className="role-selection-section">
                        <h4>Choose {foundUser.username}'s role in this event</h4>
                        <div className="roles-container">
                          <div
                            className={`role-option ${selectedRole === "Admin" ? "selected" : ""}`}
                            onClick={() => setSelectedRole("Admin")}
                            onMouseEnter={() => setShowRoleInfo("Admin")}
                            onMouseLeave={() => setShowRoleInfo(null)}
                          >
                            Admin
                            <Info size={14} className="info-icon" />
                            {showRoleInfo === "Admin" && (
                              <div className="role-info">
                                <div className="role-info-title">Admin</div>
                                <p>Full access to event management, including:</p>
                                <ul>
                                  <li>Edit event details</li>
                                  <li>View and verify attendees</li>
                                  <li>Manage payouts and finances</li>
                                  <li>Add/remove collaborators</li>
                                </ul>
                              </div>
                            )}
                          </div>
                          <div
                            className={`role-option ${selectedRole === "Check-in" ? "selected" : ""}`}
                            onClick={() => setSelectedRole("Check-in")}
                            onMouseEnter={() => setShowRoleInfo("Check-in")}
                            onMouseLeave={() => setShowRoleInfo(null)}
                          >
                            Check-in
                            <Info size={14} className="info-icon" />
                            {showRoleInfo === "Check-in" && (
                              <div className="role-info">
                                <div className="role-info-title">Check-in</div>
                                <p>Limited access focused on attendee management:</p>
                                <ul>
                                  <li>View attendee list</li>
                                  <li>Verify tickets at event entrance</li>
                                  <li>Mark attendees as checked-in</li>
                                </ul>
                                <p>Cannot edit event details or manage finances.</p>
                              </div>
                            )}
                          </div>
                          <div
                            className={`role-option ${selectedRole === "Accountant" ? "selected" : ""}`}
                            onClick={() => setSelectedRole("Accountant")}
                            onMouseEnter={() => setShowRoleInfo("Accountant")}
                            onMouseLeave={() => setShowRoleInfo(null)}
                          >
                            Accountant
                            <Info size={14} className="info-icon" />
                            {showRoleInfo === "Accountant" && (
                              <div className="role-info">
                                <div className="role-info-title">Accountant</div>
                                <p>Financial access only:</p>
                                <ul>
                                  <li>View financial information</li>
                                  <li>Create and manage payouts</li>
                                  <li>Access revenue reports</li>
                                </ul>
                                <p>Cannot edit event details or verify attendees.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="add-found-user-actions">
                        <button onClick={handleAddFoundUser} disabled={isAddingUser} className="add-found-user-button">
                          {isAddingUser ? "Adding..." : "Add Team Member"}
                        </button>
                        <button
                          onClick={() => {
                            setFoundUser(null)
                            setUidSearchTerm("")
                          }}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="team-section">
                <h3>Current Team Members</h3>
                <p>{selectedEventName}</p>

                {collaborators.length === 0 ? (
                  <div className="no-collaborators">
                    <UserPlus size={48} className="no-collab-icon" />
                    <p>No team members for this event yet</p>
                    <span>Add team members to help manage your event</span>
                  </div>
                ) : (
                  <div className="collaborators-table-container">
                    <table className="collaborators-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Date Added</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collaborators.map((collaborator) => (
                          <tr key={collaborator.id}>
                            <td>{collaborator.name}</td>
                            <td>{collaborator.email}</td>
                            <td>
                              {editingCollaborator === collaborator.id ? (
                                <div className="edit-role-container">
                                  <select
                                    value={editingRole}
                                    onChange={(e) => setEditingRole(e.target.value as any)}
                                    className="edit-role-select"
                                  >
                                    <option value="Admin">Admin</option>
                                    <option value="Check-in">Check-in</option>
                                    <option value="Accountant">Accountant</option>
                                  </select>
                                  <div className="edit-role-actions">
                                    <button
                                      onClick={() => handleSaveRole(collaborator.id, collaborator.uid)}
                                      className="save-role-btn"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button onClick={() => setEditingCollaborator(null)} className="cancel-role-btn">
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className={`role-badge role-${collaborator.role.toLowerCase()}`}>
                                  {collaborator.role}
                                </span>
                              )}
                            </td>
                            <td>{collaborator.dateAdded}</td>
                            <td>
                              <div className="collaborator-actions">
                                <button
                                  onClick={() => handleEditRole(collaborator.id, collaborator.role)}
                                  className="edit-role-button"
                                  title="Edit Role"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleRemoveCollaborator(collaborator.id, collaborator.uid)}
                                  className="remove-collaborator-button"
                                  title="Remove Collaborator"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Normal Mode - Event Selection and Management
            <>
              <div className="team-section">
                <h2>Event Selection</h2>
                <p>Select the event you want to manage collaborators for</p>

                <div className="event-select-container">
                  <select
                    value={selectedEventId}
                    onChange={handleEventChange}
                    className="event-select"
                    disabled={events.length === 0}
                  >
                    {events.length === 0 ? (
                      <option value="">No events found</option>
                    ) : (
                      events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="select-arrow" />
                </div>
              </div>

              {selectedEventId && (
                <div className="team-section">
                  <div className="event-collaboration-toggle">
                    <h3>Event Collaboration</h3>
                    <div className="toggle-container">
                      <p>
                        {selectedEventCollaboration
                          ? "Collaboration is enabled for this event"
                          : "Collaboration is disabled for this event"}
                      </p>
                      <button
                        onClick={handleToggleEventCollaboration}
                        disabled={updatingEventCollaboration}
                        className="toggle-button"
                      >
                        {selectedEventCollaboration ? (
                          <>
                            <ToggleRight size={20} /> Disable
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={20} /> Enable
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="event-agent-toggle">
                    <h3>Agent Activity</h3>
                    <div className="toggle-container">
                      <p>
                        {allowAgents
                          ? "Agents can sell tickets for this event"
                          : "Agents cannot sell tickets for this event"}
                      </p>
                      <button
                        onClick={handleToggleAgentActivity}
                        disabled={updatingAgentActivity}
                        className="toggle-button"
                      >
                        {allowAgents ? (
                          <>
                            <ToggleRight size={20} /> Disable
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={20} /> Enable
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {selectedEventCollaboration && (
                    <div className="event-team-management">
                      <div className="team-management-header">
                        <h3>Team Management</h3>
                        <button onClick={handleConfigureEvent} className="configure-button">
                          <Settings size={16} />
                          Configure Team
                        </button>
                      </div>

                      {collaborators.length === 0 ? (
                        <div className="no-collaborators">
                          <UserPlus size={48} className="no-collab-icon" />
                          <p>No team members for this event yet</p>
                          <span>Click Configure Team to add team members</span>
                        </div>
                      ) : (
                        <div className="collaborators-table-container">
                          <table className="collaborators-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Date Added</th>
                              </tr>
                            </thead>
                            <tbody>
                              {collaborators.map((collaborator) => (
                                <tr key={collaborator.id}>
                                  <td>{collaborator.name}</td>
                                  <td>{collaborator.email}</td>
                                  <td>
                                    <span className={`role-badge role-${collaborator.role.toLowerCase()}`}>
                                      {collaborator.role}
                                    </span>
                                  </td>
                                  <td>{collaborator.dateAdded}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="team-section">
                <div className="roles-info-panel">
                  <div className="roles-info-header">
                    <Shield size={20} />
                    <h3>Understanding Collaboration Roles</h3>
                  </div>
                  <div className="roles-info-content">
                    <div className="role-card">
                      <h4>Admin</h4>
                      <p>Has full access to manage the event, including:</p>
                      <ul>
                        <li>Edit event details</li>
                        <li>View and verify attendees</li>
                        <li>Manage payouts and finances</li>
                        <li>Add/remove collaborators</li>
                      </ul>
                    </div>
                    <div className="role-card">
                      <h4>Check-in</h4>
                      <p>Can only manage attendees and tickets:</p>
                      <ul>
                        <li>View attendee list</li>
                        <li>Verify tickets at event entrance</li>
                        <li>Mark attendees as checked in</li>
                      </ul>
                    </div>
                    <div className="role-card">
                      <h4>Accountant</h4>
                      <p>Can only manage financial aspects:</p>
                      <ul>
                        <li>View financial information</li>
                        <li>Create and manage payouts</li>
                        <li>Access revenue reports</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default Team
