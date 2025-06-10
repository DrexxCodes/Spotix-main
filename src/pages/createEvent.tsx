"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { db, auth } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, addDoc, doc, getDoc, setDoc, getDocs } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  HelpCircle,
  Wand2,
  Check,
  Upload,
  X,
  Users,
  AlertCircle,
  UserCheck,
  Calendar,
  FolderPlus,
  Search,
  Link,
  Eye,
} from "lucide-react"
import Preloader from "../components/preloader"
import BookersHeader from "../components/BookersHeader"
import { uploadImage } from "../utils/imageUploader"
import "../styles/create.css"

interface EventCollection {
  id: string
  name: string
  image: string
  description: string
}

const CreateEvent = () => {
  const [currentDateTime, setCurrentDateTime] = useState("")
  const [activeTab, setActiveTab] = useState<"one-time" | "recurring">("one-time")

  // One-time event states
  const [eventName, setEventName] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [enhancedDescription, setEnhancedDescription] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventVenue, setEventVenue] = useState("")
  const [eventStart, setEventStart] = useState("")
  const [eventEnd, setEventEnd] = useState("")
  const [eventEndDate, setEventEndDate] = useState("")
  const [eventType, setEventType] = useState("Night party")

  // Recurring event states
  const [recurringEventName, setRecurringEventName] = useState("")
  const [recurringEventDescription, setRecurringEventDescription] = useState("")
  const [recurringEventImage, setRecurringEventImage] = useState<File | null>(null)
  const [recurringEventImageUrl, setRecurringEventImageUrl] = useState("")

  // Event collection states
  const [selectedEventCollection, setSelectedEventCollection] = useState<EventCollection | null>(null)
  const [showCollectionDialog, setShowCollectionDialog] = useState(false)
  const [eventCollections, setEventCollections] = useState<EventCollection[]>([])
  const [collectionSearchTerm, setCollectionSearchTerm] = useState("")
  const [showRecurringConfirmDialog, setShowRecurringConfirmDialog] = useState(false)

  // Image handling states
  const [eventImage, setEventImage] = useState<File | null>(null)
  const [eventImageUrl, setEventImageUrl] = useState("")
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [isUrlVerified, setIsUrlVerified] = useState(false)
  const [isVerifyingUrl, setIsVerifyingUrl] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [uploadProvider, setUploadProvider] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  // Recurring event upload states
  const [recurringImageUrlInput, setRecurringImageUrlInput] = useState("")
  const [isRecurringUrlVerified, setIsRecurringUrlVerified] = useState(false)
  const [isVerifyingRecurringUrl, setIsVerifyingRecurringUrl] = useState(false)
  const [showRecurringUrlInput, setShowRecurringUrlInput] = useState(false)
  const [recurringUploadProgress, setRecurringUploadProgress] = useState(0)
  const [isRecurringUploading, setIsRecurringUploading] = useState(false)
  const [recurringUploadComplete, setRecurringUploadComplete] = useState(false)
  const [recurringUploadedImageUrl, setRecurringUploadedImageUrl] = useState<string | null>(null)

  const cancelUploadRef = useRef<(() => void) | null>(null)
  const cancelRecurringUploadRef = useRef<(() => void) | null>(null)

  const [enablePricing, setEnablePricing] = useState(false)
  const [ticketPrices, setTicketPrices] = useState([{ policy: "", price: "" }])

  const [enableStopDate, setEnableStopDate] = useState(false)
  const [stopDate, setStopDate] = useState("")

  const [enableColorCode, setEnableColorCode] = useState(false)
  const [colorCode, setColorCode] = useState("#6b2fa5")

  const [enableMaxSize, setEnableMaxSize] = useState(false)
  const [maxSize, setMaxSize] = useState("")

  // New state variables for collaboration and agent settings
  const [enabledCollaboration, setEnabledCollaboration] = useState(false)
  const [allowAgents, setAllowAgents] = useState(false)
  const [isCollaborationEnabled, setIsCollaborationEnabled] = useState(false)
  const [collaborationMessage, setCollaborationMessage] = useState("")

  const [loading, setLoading] = useState(true)
  const [enhancing, setEnhancing] = useState(false)
  const [createdEventData, setCreatedEventData] = useState<any>(null)
  const navigate = useNavigate()

  // Update current date and time every second
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date()
      setCurrentDateTime(now.toLocaleString())
    }

    updateCurrentTime()
    const interval = setInterval(updateCurrentTime, 1000)

    return () => clearInterval(interval)
  }, [])

  // Calculate minimum date (current date + 2 days)
  const getMinDate = () => {
    const today = new Date()
    const minDate = new Date(today)
    minDate.setDate(today.getDate() + 2)
    return minDate.toISOString().split("T")[0]
  }

  useEffect(() => {
    const checkBookerStatus = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          // Check if user is a booker
          const userData = userDoc.data()
          if (!userData.isBooker) {
            // User is not a booker, redirect to booker role page
            navigate("/bookerRole")
          } else {
            // User is a booker, allow access to page
            // Check if collaboration is enabled for this user
            setIsCollaborationEnabled(userData.enabledCollaboration === true)
            if (userData.enabledCollaboration !== true) {
              setCollaborationMessage(
                "Collaboration is disabled. Enable it in your booker profile settings to add team members.",
              )
            }
            setLoading(false)
          }
        } else {
          // User document doesn't exist
          navigate("/bookerRole")
        }
      } catch (error) {
        console.error("Error checking booker status:", error)
        navigate("/login")
      }
    }

    checkBookerStatus()
  }, [navigate])

  // Fetch event collections when dialog opens
  const fetchEventCollections = async () => {
    try {
      const user = auth.currentUser
      if (!user) return

      const collectionsRef = collection(db, "EventCollection", user.uid, "collections")
      const collectionsSnapshot = await getDocs(collectionsRef)

      const collections: EventCollection[] = []
      collectionsSnapshot.forEach((doc) => {
        const data = doc.data()
        collections.push({
          id: doc.id,
          name: data.name || doc.id,
          image: data.image || "",
          description: data.description || "",
        })
      })

      setEventCollections(collections)
    } catch (error) {
      console.error("Error fetching event collections:", error)
    }
  }

  // Clean up upload when component unmounts
  useEffect(() => {
    return () => {
      if (cancelUploadRef.current) {
        cancelUploadRef.current()
      }
      if (cancelRecurringUploadRef.current) {
        cancelRecurringUploadRef.current()
      }
    }
  }, [])

  const addPricingRow = () => {
    setTicketPrices([...ticketPrices, { policy: "", price: "" }])
  }

  const generateUniqueId = () => {
    return {
      payId: `SPTXP-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    }
  }

  // URL verification function
  const verifyImageUrl = async (url: string, isRecurring = false) => {
    if (isRecurring) {
      setIsVerifyingRecurringUrl(true)
    } else {
      setIsVerifyingUrl(true)
    }

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      const isValid = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = url
      })

      if (isValid) {
        if (isRecurring) {
          setRecurringEventImageUrl(url)
          setIsRecurringUrlVerified(true)
          setRecurringEventImage(null) // Clear file upload
        } else {
          setEventImageUrl(url)
          setIsUrlVerified(true)
          setEventImage(null) // Clear file upload
        }
        alert("Image URL verified successfully!")
      } else {
        alert("Invalid image URL. Please check the URL and try again.")
      }
    } catch (error) {
      console.error("Error verifying URL:", error)
      alert("Error verifying image URL. Please try again.")
    } finally {
      if (isRecurring) {
        setIsVerifyingRecurringUrl(false)
      } else {
        setIsVerifyingUrl(false)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    setEventImage(file)

    // Clear URL input when file is selected
    setImageUrlInput("")
    setIsUrlVerified(false)

    // Preview URL for local display
    const previewUrl = URL.createObjectURL(file)
    setEventImageUrl(previewUrl)

    // Reset upload state
    setUploadProgress(0)
    setUploadComplete(false)
    setUploadedImageUrl(null)

    // Start background upload
    startBackgroundUpload(file)
  }

  const handleRecurringFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    setRecurringEventImage(file)

    // Clear URL input when file is selected
    setRecurringImageUrlInput("")
    setIsRecurringUrlVerified(false)

    // Preview URL for local display
    const previewUrl = URL.createObjectURL(file)
    setRecurringEventImageUrl(previewUrl)

    // Reset upload state
    setRecurringUploadProgress(0)
    setRecurringUploadComplete(false)
    setRecurringUploadedImageUrl(null)

    // Start background upload
    startRecurringBackgroundUpload(file)
  }

  const startBackgroundUpload = (file: File) => {
    // Cancel any existing upload
    if (cancelUploadRef.current) {
      cancelUploadRef.current()
      cancelUploadRef.current = null
    }

    setIsUploading(true)
    setUploadProgress(0)

    const { uploadPromise, cancelUpload } = uploadImage(file, {
      cloudinaryFolder: "Events",
      onProgress: (progress) => {
        setUploadProgress(progress)
      },
      showAlert: false,
    })

    // Store the cancel function
    cancelUploadRef.current = cancelUpload

    uploadPromise
      .then(({ url, provider }) => {
        setIsUploading(false)

        if (url) {
          setUploadComplete(true)
          setUploadedImageUrl(url)
          setUploadProvider(provider)

          // Hide the success message after 5 seconds
          setTimeout(() => {
            setUploadComplete(false)
          }, 5000)
        }
      })
      .catch((error) => {
        console.error("Upload failed:", error)
        setIsUploading(false)
      })
  }

  const startRecurringBackgroundUpload = (file: File) => {
    // Cancel any existing upload
    if (cancelRecurringUploadRef.current) {
      cancelRecurringUploadRef.current()
      cancelRecurringUploadRef.current = null
    }

    setIsRecurringUploading(true)
    setRecurringUploadProgress(0)

    const { uploadPromise, cancelUpload } = uploadImage(file, {
      cloudinaryFolder: "EventCollections",
      onProgress: (progress) => {
        setRecurringUploadProgress(progress)
      },
      showAlert: false,
    })

    // Store the cancel function
    cancelRecurringUploadRef.current = cancelUpload

    uploadPromise
      .then(({ url, provider }) => {
        setIsRecurringUploading(false)

        if (url) {
          setRecurringUploadComplete(true)
          setRecurringUploadedImageUrl(url)

          // Hide the success message after 5 seconds
          setTimeout(() => {
            setRecurringUploadComplete(false)
          }, 5000)
        }
      })
      .catch((error) => {
        console.error("Recurring upload failed:", error)
        setIsRecurringUploading(false)
      })
  }

  const cancelCurrentUpload = () => {
    if (cancelUploadRef.current) {
      cancelUploadRef.current()
      cancelUploadRef.current = null
      setIsUploading(false)
    }
  }

  const cancelRecurringUpload = () => {
    if (cancelRecurringUploadRef.current) {
      cancelRecurringUploadRef.current()
      cancelRecurringUploadRef.current = null
      setIsRecurringUploading(false)
    }
  }

  const applyEnhancedDescription = () => {
    if (enhancedDescription) {
      setEventDescription(enhancedDescription)
      setEnhancedDescription("")
    }
  }

  const enhanceDescription = async () => {
    if (!eventName || !eventDescription.trim() || !eventDate || !eventVenue || !eventType) {
      alert("Please fill in event name, description, date, venue, and type before enhancing")
      return
    }

    try {
      setEnhancing(true)

      // Format the date for better context
      const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      // Log the data being sent to the API
      console.log("Sending for enhancement:", {
        eventName,
        eventDescription,
        eventDate: formattedDate,
        eventVenue,
        eventType,
      })

      const response = await fetch("https://spotix-backend.onrender.com/api/gemini/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventName,
          eventDescription,
          eventDate: formattedDate,
          eventVenue,
          eventType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Enhancement error details:", errorData)
        throw new Error(`Failed to enhance description: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setEnhancedDescription(data.enhancedDescription)
    } catch (error: any) {
      console.error("Error enhancing description:", error)
      alert(`Failed to enhance description: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setEnhancing(false)
    }
  }

  // Validate end time is after start time
  const validateEndTime = (endTime: string) => {
    if (!eventDate || !eventStart) return true

    const startDateTime = new Date(`${eventDate}T${eventStart}`)
    const endDateTime = new Date(`${eventEndDate}T${endTime}`)

    return endDateTime > startDateTime
  }

  // Validate stop date is before event start date
  const validateStopDate = (date: string) => {
    if (!eventDate) return true

    const startDateTime = new Date(eventDate)
    const stopDateTime = new Date(date)

    return stopDateTime < startDateTime
  }

  const handleAddToEventCollection = () => {
    setShowCollectionDialog(true)
    fetchEventCollections()
  }

  const handleSelectEventCollection = (collection: EventCollection) => {
    setSelectedEventCollection(collection)
    setShowCollectionDialog(false)
    setCollectionSearchTerm("")
  }

  const handleCreateRecurringEvent = () => {
    if (!recurringEventName.trim() || !recurringEventDescription.trim()) {
      alert("Please fill in all required fields for the recurring event.")
      return
    }

    // Check if we have either uploaded image or verified URL
    if (!recurringEventImage && !isRecurringUrlVerified) {
      alert("Please either upload an image or provide a valid image URL.")
      return
    }

    setShowRecurringConfirmDialog(true)
  }

  const handleConfirmRecurringEvent = async () => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      // Use the already uploaded image URL if available, otherwise use verified URL
      let imageUrl = recurringUploadedImageUrl || (isRecurringUrlVerified ? recurringImageUrlInput : null)

      if (!imageUrl && recurringEventImage) {
        // If upload is still in progress or failed, start a new one
        const { url } = await new Promise<{ url: string | null; provider: string | null }>((resolve) => {
          const { uploadPromise } = uploadImage(recurringEventImage, {
            cloudinaryFolder: "EventCollections",
            onProgress: (progress) => {
              setRecurringUploadProgress(progress)
            },
            showAlert: false,
          })

          uploadPromise.then(resolve)
        })

        if (!url) {
          throw new Error("Image upload failed. Please try again.")
        }

        imageUrl = url
      }

      if (!imageUrl) {
        throw new Error("Image upload failed. Please try again.")
      }

      // Create the event collection in EventCollection/{userId}/collections/{eventName}
      const eventCollectionRef = doc(db, "EventCollection", user.uid, "collections", recurringEventName)
      await setDoc(eventCollectionRef, {
        name: recurringEventName,
        image: imageUrl,
        description: recurringEventDescription,
        createdAt: new Date(),
        createdBy: user.uid,
      })

      // Create the public event collection in publicEvents
      const publicEventCollectionRef = doc(db, "publicEvents", recurringEventName)
      await setDoc(publicEventCollectionRef, {
        eventName: recurringEventName,
        imageURL: imageUrl,
        eventGroup: true,
        createdAt: new Date(),
        timestamp: new Date(),
        creatorID: user.uid,
      })

      console.log("✅ Event collection created successfully")

      // Reset form and close dialog
      setRecurringEventName("")
      setRecurringEventDescription("")
      setRecurringEventImage(null)
      setRecurringEventImageUrl("")
      setRecurringUploadedImageUrl(null)
      setRecurringImageUrlInput("")
      setIsRecurringUrlVerified(false)
      setShowRecurringConfirmDialog(false)
      setLoading(false)

      alert("Event collection created successfully!")
    } catch (error: any) {
      console.error("Error creating event collection:", error)
      alert(`Failed to create event collection: ${error.message}`)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (
        !eventName ||
        !eventDescription ||
        !eventDate ||
        !eventVenue ||
        !eventStart ||
        !eventEnd ||
        !eventEndDate ||
        !eventType
      ) {
        throw new Error("Please fill in all required fields.")
      }

      // Validate image is selected or URL is verified
      if (!eventImage && !isUrlVerified) {
        throw new Error("Please either upload an image or provide a valid image URL.")
      }

      // Validate end time is after start time
      if (!validateEndTime(eventEnd)) {
        throw new Error("Event end time must be after start time.")
      }

      // Validate stop date is before event start date
      if (enableStopDate && !validateStopDate(stopDate)) {
        throw new Error("Ticket sales stop date must be before event start date.")
      }

      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      const { payId } = generateUniqueId()
      const isFree = !enablePricing

      // Use the already uploaded image URL if available, otherwise use verified URL
      let imageUrl = uploadedImageUrl || (isUrlVerified ? imageUrlInput : null)
      let provider = uploadProvider

      if (!imageUrl && eventImage) {
        // If upload is still in progress, wait for it to complete
        if (isUploading && cancelUploadRef.current) {
          const { url, provider: uploadedProvider } = await new Promise<{
            url: string | null
            provider: string | null
          }>((resolve) => {
            const { uploadPromise } = uploadImage(eventImage, {
              cloudinaryFolder: "Events",
              onProgress: (progress) => {
                setUploadProgress(progress)
              },
              showAlert: false,
            })

            uploadPromise.then(resolve)
          })

          if (!url) {
            throw new Error("Image upload failed. Please try again.")
          }

          imageUrl = url
          provider = uploadedProvider
        } else {
          // If no upload has started or it failed, start a new one
          const { url, provider: uploadedProvider } = await new Promise<{
            url: string | null
            provider: string | null
          }>((resolve) => {
            const { uploadPromise } = uploadImage(eventImage, {
              cloudinaryFolder: "Events",
              onProgress: (progress) => {
                setUploadProgress(progress)
              },
              showAlert: false,
            })

            uploadPromise.then(resolve)
          })

          if (!url) {
            throw new Error("Image upload failed. Please try again.")
          }

          imageUrl = url
          provider = uploadedProvider
        }
      }

      if (!imageUrl) {
        throw new Error("Image upload failed. Please try again.")
      }

      // Get user data for booker name
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const userData = userDoc.exists() ? userDoc.data() : {}
      const bookerName = userData.username || userData.fullName || "Unknown Booker"

      const eventData = {
        eventName,
        eventDescription,
        eventDate,
        eventEndDate,
        eventVenue,
        eventStart,
        eventEnd,
        eventType,
        eventImage: imageUrl,
        imageProvider: provider,
        ticketPrices: isFree ? [] : ticketPrices,
        enableStopDate,
        stopDate: enableStopDate ? stopDate : null,
        enableColorCode,
        colorCode: enableColorCode ? colorCode : null,
        enableMaxSize,
        maxSize: enableMaxSize ? maxSize : null,
        isFree,
        payId,
        createdBy: user.uid,
        bookerName,
        createdAt: new Date(),
        ticketsSold: 0,
        totalRevenue: 0,
        status: "active",
        enabledCollaboration: enabledCollaboration,
        allowAgents: allowAgents,
        // Add collection reference if selected
        eventCollection: selectedEventCollection ? selectedEventCollection.name : null,
      }

      // STEP 1: Always add event to the standard nested location first
      const eventsCollectionRef = collection(db, "events", user.uid, "userEvents")
      const docRef = await addDoc(eventsCollectionRef, eventData)

      const eventId = docRef.id

      // Update the document with its ID and the eventId
      await setDoc(
        doc(db, "events", user.uid, "userEvents", docRef.id),
        {
          eventId: eventId,
          id: docRef.id,
        },
        { merge: true },
      )

      console.log("✅ Event successfully created in standard location:", docRef.id)

      // STEP 2: Create duplicate in publicEvents collection at root level
      try {
        const publicEventData = {
          imageURL: imageUrl,
          eventType: eventType,
          venue: eventVenue,
          eventStartDate: eventDate,
          eventName: eventName,
          freeOrPaid:
            enablePricing && ticketPrices.length > 0 && ticketPrices.some((ticket) => ticket.policy && ticket.price),
          timestamp: new Date(),
          creatorID: user.uid,
          eventId: eventId,
          eventGroup: false, // This is a regular event, not a group
        }

        // Create document in publicEvents collection with eventName as document ID
        const publicEventDocRef = doc(db, "publicEvents", eventName)
        await setDoc(publicEventDocRef, publicEventData)

        console.log("✅ Event successfully duplicated to publicEvents collection:", eventName)
      } catch (publicEventError) {
        console.error("❌ Error creating publicEvents document:", publicEventError)
        console.warn("Main event was created successfully, but publicEvents creation failed")
      }

      // STEP 3: If event collection is selected, also add reference to the collection
      if (selectedEventCollection) {
        try {
          // Add a reference document in the event collection
          const collectionEventRef = doc(
            db,
            "EventCollection",
            user.uid,
            "collections",
            selectedEventCollection.name,
            "events",
            eventId,
          )
          await setDoc(collectionEventRef, {
            eventId: eventId,
            eventName: eventName,
            eventImage: imageUrl,
            eventDate: eventDate,
            eventVenue: eventVenue,
            eventType: eventType,
            isFree: isFree,
            ticketPrices: eventData.ticketPrices,
            createdAt: new Date(),
            collectionName: selectedEventCollection.name,
            eventCollectionTheme: eventName,
          })

          console.log("✅ Event reference added to collection:", selectedEventCollection.name)
        } catch (collectionError) {
          console.error("❌ Error adding event to collection:", collectionError)
          console.warn("Event was created successfully, but collection reference failed")
        }
      }

      // Store the created event data for success page
      setCreatedEventData({
        eventId,
        payId,
      })

      console.log("🎉 Event creation process completed successfully")

      // Navigate to success page
      navigate("/success", { state: { eventId, payId } })
    } catch (error: any) {
      console.error("Create event error:", error)
      alert(`Failed to create event: ${error.message}`)
      setLoading(false)
    }
  }

  const filteredCollections = eventCollections.filter((collection) =>
    collection.name.toLowerCase().includes(collectionSearchTerm.toLowerCase()),
  )

  return (
    <>
      <Preloader loading={loading} />
      <BookersHeader />
      <Helmet>
        <title>Create Event</title>
        <meta
          name="description"
          content="Find, book, and attend the best events on your campus. Discover concerts, night parties, workshops, religious events, and more on Spotix."
        />
        {/* Open Graph for social media */}
        <meta property="og:title" content="Spotix | Discover and Book Campus Events" />
        <meta
          property="og:description"
          content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix."
        />
        <meta property="og:image" content="/meta.png" />
        <meta property="og:url" content="https://spotix.com.ng" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Spotix | Discover and Book Campus Events" />
        <meta
          name="twitter:description"
          content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix."
        />
        <meta name="twitter:image" content="/meta.png" />
      </Helmet>

      <div className="create-event-container">
        <div className="current-datetime">Current Date and Time: {currentDateTime}</div>
        <img src="/create-event.svg" alt="Create Event" className="event-image" />
        <h2>Create Your Event: The magic starts here✨</h2>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === "one-time" ? "active" : ""}`}
            onClick={() => setActiveTab("one-time")}
          >
            <Calendar size={18} />
            One-time Event
          </button>
          <button
            className={`tab-button ${activeTab === "recurring" ? "active" : ""}`}
            onClick={() => setActiveTab("recurring")}
          >
            <FolderPlus size={18} />
            Recurring Event
          </button>
        </div>

        {/* One-time Event Tab */}
        {activeTab === "one-time" && (
          <form onSubmit={handleSubmit}>
            {/* Event Collection Selection */}
            {selectedEventCollection && (
              <div className="selected-collection-display">
                <div className="collection-info">
                  <img
                    src={selectedEventCollection.image || "/placeholder.svg"}
                    alt={selectedEventCollection.name}
                    className="collection-image"
                  />
                  <div className="collection-details">
                    <h4>Event Collection: {selectedEventCollection.name}</h4>
                  </div>
                  <button
                    type="button"
                    className="remove-collection-btn"
                    onClick={() => setSelectedEventCollection(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="collection-action-container">
              <button type="button" className="add-to-collection-btn" onClick={handleAddToEventCollection}>
                <FolderPlus size={18} />
                Add to Event Collection
              </button>
            </div>

            <div className="event-section">
              <h3>Event Bio-Data</h3>
              <label>{selectedEventCollection ? "Event Collection Theme" : "Event Name"}</label>
              <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required />

              <label>Event Image</label>
              <div className="image-input-section">
                {/* URL Input Option */}
                <div className="url-input-container">
                  <button type="button" className="toggle-url-btn" onClick={() => setShowUrlInput(!showUrlInput)}>
                    <Link size={16} />
                    {showUrlInput ? "Hide URL Input" : "Use Image URL"}
                  </button>

                  {showUrlInput && !eventImage && (
                    <div className="url-input-wrapper">
                      <input
                        type="url"
                        placeholder="Enter image URL"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        className="url-input"
                      />
                      <button
                        type="button"
                        className="verify-url-btn"
                        onClick={() => verifyImageUrl(imageUrlInput)}
                        disabled={!imageUrlInput || isVerifyingUrl}
                      >
                        <Eye size={16} />
                        {isVerifyingUrl ? "Verifying..." : "Verify"}
                      </button>
                    </div>
                  )}
                </div>

                {/* File Upload Option */}
                {!isUrlVerified && (
                  <div className="custom-file-upload">
                    <input
                      type="file"
                      id="file-upload"
                      accept="image/*"
                      onChange={handleFileChange}
                      required={!isUrlVerified}
                      key={fileInputKey}
                      className="hidden-file-input"
                    />
                    <label htmlFor="file-upload" className="file-upload-button">
                      <Upload size={18} className="upload-icon" />
                      {eventImage ? eventImage.name : "Choose an image for your event"}
                    </label>

                    {isUploading && (
                      <div className="upload-progress-container">
                        <div className="upload-progress-bar">
                          <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <div className="upload-progress-text">
                          Uploading: {uploadProgress}%
                          <button
                            type="button"
                            className="cancel-upload-button"
                            onClick={cancelCurrentUpload}
                            aria-label="Cancel upload"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {uploadComplete && (
                      <div className="upload-complete">
                        <Check size={16} className="upload-complete-icon" />
                        Image uploaded successfully
                      </div>
                    )}
                  </div>
                )}

                {eventImageUrl && (
                  <div className="image-preview">
                    <img src={eventImageUrl || "/placeholder.svg"} alt="Event preview" style={{ maxWidth: "200px" }} />
                    {isUrlVerified && (
                      <div className="url-verified-badge">
                        <Check size={16} />
                        URL Verified
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label>Event Description</label>
              <div className="description-container">
                <textarea
                  style={{ height: "200px" }}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  required
                  className={enhancing ? "enhancing" : ""}
                  placeholder="Describe your event here. You can enhance this description with AI by clicking the 'Enhance' button after filling in the event details."
                ></textarea>
                <button
                  type="button"
                  className="enhance-button"
                  onClick={enhanceDescription}
                  disabled={
                    enhancing || !eventDescription.trim() || !eventDate || !eventVenue || !eventName || !eventType
                  }
                  title="Transform your description into a captivating event promotion"
                >
                  <Wand2 size={18} />
                  {enhancing ? "Enhancing..." : "Enhance"}
                </button>
              </div>

              {enhancedDescription && (
                <div className="enhanced-description-container">
                  <div className="enhanced-header">
                    <label>Enhanced Version</label>
                    <button type="button" className="apply-changes-button" onClick={applyEnhancedDescription}>
                      <Check size={16} />
                      Apply Changes
                    </button>
                  </div>
                  <div className="enhanced-description">
                    <textarea value={enhancedDescription} readOnly className="enhanced-textarea"></textarea>
                  </div>
                </div>
              )}

              <label>Event Start Date</label>
              <div className="date-input-container">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  min={getMinDate()}
                  className="date-input"
                />
              </div>

              <label>Event Venue</label>
              <input type="text" value={eventVenue} onChange={(e) => setEventVenue(e.target.value)} required />

              <label>Event Start Time</label>
              <div className="time-input-container">
                <input type="time" value={eventStart} onChange={(e) => setEventStart(e.target.value)} required />
              </div>

              <label>Event End Date</label>
              <div className="date-input-container">
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  required
                  disabled={!eventDate}
                  min={eventDate}
                  className="date-input"
                  onClick={() => {
                    if (!eventDate) {
                      alert("Please select a start date first")
                    }
                  }}
                />
              </div>

              <label>Event End Time</label>
              <div className="time-input-container">
                <input
                  type="time"
                  value={eventEnd}
                  onChange={(e) => {
                    const newTime = e.target.value
                    if (eventDate === eventEndDate && newTime <= eventStart) {
                      alert("End time must be after start time")
                      return
                    }
                    setEventEnd(newTime)
                  }}
                  required
                  disabled={!eventStart}
                  onClick={() => {
                    if (!eventStart) {
                      alert("Please select a start time first")
                    }
                  }}
                />
              </div>

              <label>Event Type</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} required>
                <option value="Night party">Night party</option>
                <option value="Concert">Concert</option>
                <option value="Religious">Religious</option>
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
                    <input type="checkbox" checked={enablePricing} onChange={() => setEnablePricing(!enablePricing)} />
                    <span className="slider round"></span>
                  </div>
                </label>
                <span title="This part is for adding ticket policy and prices">
                  <HelpCircle size={16} />
                </span>
              </div>

              {enablePricing && (
                <>
                  {ticketPrices.map((ticket, index) => (
                    <div key={index} className="ticket-pricing-row">
                      <input
                        type="text"
                        placeholder="Ticket Type"
                        value={ticket.policy}
                        onChange={(e) => {
                          const newTickets = [...ticketPrices]
                          newTickets[index].policy = e.target.value
                          setTicketPrices(newTickets)
                        }}
                        required={enablePricing}
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={ticket.price}
                        onChange={(e) => {
                          const newTickets = [...ticketPrices]
                          newTickets[index].price = e.target.value
                          setTicketPrices(newTickets)
                        }}
                        required={enablePricing}
                      />
                    </div>
                  ))}
                  <button type="button" className="add-price-button" onClick={addPricingRow}>
                    <Plus size={16} /> Add Ticket Type
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
                      checked={enableStopDate}
                      onChange={() => setEnableStopDate(!enableStopDate)}
                    />
                    <span className="slider round"></span>
                  </div>
                </label>
                {enableStopDate && (
                  <input
                    type="datetime-local"
                    value={stopDate}
                    onChange={(e) => {
                      const newDate = e.target.value
                      if (eventDate && !validateStopDate(newDate)) {
                        alert("Stop date must be before event start date")
                        return
                      }
                      setStopDate(newDate)
                    }}
                    required={enableStopDate}
                    max={eventDate ? new Date(eventDate).toISOString().slice(0, 16) : undefined}
                  />
                )}
              </div>

              <div className="option-row switch-container">
                <label>
                  Enable Color Theme for Event
                  <div className="switch">
                    <input
                      type="checkbox"
                      checked={enableColorCode}
                      onChange={() => setEnableColorCode(!enableColorCode)}
                    />
                    <span className="slider round"></span>
                  </div>
                </label>
                {enableColorCode && (
                  <input type="color" value={colorCode} onChange={(e) => setColorCode(e.target.value)} />
                )}
              </div>

              <div className="option-row switch-container">
                <label>
                  Set Maximum Attendees
                  <div className="switch">
                    <input type="checkbox" checked={enableMaxSize} onChange={() => setEnableMaxSize(!enableMaxSize)} />
                    <span className="slider round"></span>
                  </div>
                </label>
                {enableMaxSize && (
                  <input
                    type="number"
                    value={maxSize}
                    onChange={(e) => setMaxSize(e.target.value)}
                    min="1"
                    required={enableMaxSize}
                  />
                )}
              </div>

              {/* Collaboration Settings */}
              <div className="collaboration-settings">
                <h4 className="settings-subheader">
                  <Users size={18} className="settings-icon" />
                  Team Collaboration Settings
                </h4>

                {!isCollaborationEnabled ? (
                  <div className="collaboration-disabled-notice">
                    <AlertCircle size={16} className="alert-icon" />
                    <p>{collaborationMessage}</p>
                    <button
                      type="button"
                      className="profile-settings-button"
                      onClick={() => navigate("/bookerprofile")}
                    >
                      Go to Profile Settings
                    </button>
                  </div>
                ) : (
                  <div className="option-row switch-container">
                    <label>
                      Enable Team Collaboration for this Event
                      <div className="switch">
                        <input
                          type="checkbox"
                          checked={enabledCollaboration}
                          onChange={() => setEnabledCollaboration(!enabledCollaboration)}
                        />
                        <span className="slider round"></span>
                      </div>
                    </label>
                    <span title="Allow other users to help manage this event">
                      <HelpCircle size={16} />
                    </span>
                  </div>
                )}

                {enabledCollaboration && (
                  <div className="agent-info-message">
                    <Check size={16} className="check-icon" />
                    <p>You can now add Team members after creating the event from the Teams page.</p>
                  </div>
                )}

                {/* Agent Activity Settings */}
                <h4 className="settings-subheader">
                  <UserCheck size={18} className="settings-icon" />
                  Agent Activity Settings
                </h4>

                <div className="option-row switch-container">
                  <label>
                    Allow Agent Ticket Sales for this Event
                    <div className="switch">
                      <input type="checkbox" checked={allowAgents} onChange={() => setAllowAgents(!allowAgents)} />
                      <span className="slider round"></span>
                    </div>
                  </label>
                  <span title="Enable agents to sell tickets for this event">
                    <HelpCircle size={16} />
                  </span>
                </div>

                {allowAgents && (
                  <div className="agent-info-message">
                    <Check size={16} className="check-icon" />
                    <p>Agents will be able to sell tickets for this event and earn commission.</p>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="create-button">
              Create Event
            </button>
          </form>
        )}

        {/* Recurring Event Tab */}
        {activeTab === "recurring" && (
          <div className="recurring-event-form">
            <div className="event-section">
              <h3>Create Event Collection</h3>

              <label>Recurring Event Name</label>
              <input
                type="text"
                value={recurringEventName}
                onChange={(e) => setRecurringEventName(e.target.value)}
                placeholder="e.g., Monthly Tech Meetup, Weekly Music Night"
                required
              />

              <label>Recur Event Image</label>
              <div className="image-input-section">
                {/* URL Input Option */}
                <div className="url-input-container">
                  <button
                    type="button"
                    className="toggle-url-btn"
                    onClick={() => setShowRecurringUrlInput(!showRecurringUrlInput)}
                  >
                    <Link size={16} />
                    {showRecurringUrlInput ? "Hide URL Input" : "Use Image URL"}
                  </button>

                  {showRecurringUrlInput && !recurringEventImage && (
                    <div className="url-input-wrapper">
                      <input
                        type="url"
                        placeholder="Enter image URL"
                        value={recurringImageUrlInput}
                        onChange={(e) => setRecurringImageUrlInput(e.target.value)}
                        className="url-input"
                      />
                      <button
                        type="button"
                        className="verify-url-btn"
                        onClick={() => verifyImageUrl(recurringImageUrlInput, true)}
                        disabled={!recurringImageUrlInput || isVerifyingRecurringUrl}
                      >
                        <Eye size={16} />
                        {isVerifyingRecurringUrl ? "Verifying..." : "Verify"}
                      </button>
                    </div>
                  )}
                </div>

                {/* File Upload Option */}
                {!isRecurringUrlVerified && (
                  <div className="custom-file-upload">
                    <input
                      type="file"
                      id="recurring-file-upload"
                      accept="image/*"
                      onChange={handleRecurringFileChange}
                      required={!isRecurringUrlVerified}
                      className="hidden-file-input"
                    />
                    <label htmlFor="recurring-file-upload" className="file-upload-button">
                      <Upload size={18} className="upload-icon" />
                      {recurringEventImage ? recurringEventImage.name : "Choose an image for your event collection"}
                    </label>

                    {isRecurringUploading && (
                      <div className="upload-progress-container">
                        <div className="upload-progress-bar">
                          <div className="upload-progress-fill" style={{ width: `${recurringUploadProgress}%` }}></div>
                        </div>
                        <div className="upload-progress-text">
                          Uploading: {recurringUploadProgress}%
                          <button
                            type="button"
                            className="cancel-upload-button"
                            onClick={cancelRecurringUpload}
                            aria-label="Cancel upload"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {recurringUploadComplete && (
                      <div className="upload-complete">
                        <Check size={16} className="upload-complete-icon" />
                        Image uploaded successfully
                      </div>
                    )}
                  </div>
                )}

                {recurringEventImageUrl && (
                  <div className="image-preview">
                    <img
                      src={recurringEventImageUrl || "/placeholder.svg"}
                      alt="Event collection preview"
                      style={{ maxWidth: "200px" }}
                    />
                    {isRecurringUrlVerified && (
                      <div className="url-verified-badge">
                        <Check size={16} />
                        URL Verified
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label>Description</label>
              <textarea
                style={{ height: "150px" }}
                value={recurringEventDescription}
                onChange={(e) => setRecurringEventDescription(e.target.value)}
                placeholder="Describe your event collection. This will help people understand what type of events to expect."
                required
              ></textarea>
            </div>

            <button type="button" className="create-button" onClick={handleCreateRecurringEvent}>
              Create Event Collection
            </button>
          </div>
        )}

        {/* Event Collection Selection Dialog */}
        {showCollectionDialog && (
          <div className="dialog-overlay">
            <div className="collection-dialog">
              <div className="dialog-header">
                <h3>Select Event Collection</h3>
                <button
                  className="close-dialog-btn"
                  onClick={() => {
                    setShowCollectionDialog(false)
                    setCollectionSearchTerm("")
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="search-container">
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search event collections..."
                    value={collectionSearchTerm}
                    onChange={(e) => setCollectionSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <div className="collections-list">
                {filteredCollections.length === 0 ? (
                  <div className="no-collections">
                    <FolderPlus size={48} className="no-collections-icon" />
                    <p>No event collections found.</p>
                    <p>Create a recurring event first to see collections here.</p>
                  </div>
                ) : (
                  filteredCollections.map((collection) => (
                    <div
                      key={collection.id}
                      className="collection-item"
                      onClick={() => handleSelectEventCollection(collection)}
                    >
                      <img
                        src={collection.image || "/placeholder.svg"}
                        alt={collection.name}
                        className="collection-item-image"
                      />
                      <div className="collection-item-details">
                        <h4>{collection.name}</h4>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recurring Event Confirmation Dialog */}
        {showRecurringConfirmDialog && (
          <div className="dialog-overlay">
            <div className="confirmation-dialog">
              <div className="dialog-header">
                <AlertCircle size={40} className="warning-icon" />
                <h3>Confirm Event Collection Creation</h3>
              </div>
              <p>
                You are about to create an event collection called <strong>"{recurringEventName}"</strong>. Please
                ensure the name, image and description is accurate to your event as you can't edit this event collection
                detail again.
              </p>
              <div className="dialog-actions">
                <button className="secondary-button" onClick={() => setShowRecurringConfirmDialog(false)}>
                  Let me check well
                </button>
                <button className="primary-button" onClick={handleConfirmRecurringEvent}>
                  Go Ahead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default CreateEvent
