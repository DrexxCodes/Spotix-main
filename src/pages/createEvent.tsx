"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { db, auth } from "../services/firebase"
import { collection, addDoc, doc, getDoc, setDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import { Plus, HelpCircle, Wand2, Check, Calendar, Clock, Upload, X } from "lucide-react"
import Preloader from "../components/preloader"
import BookersHeader from "../components/BookersHeader"
import { uploadImage } from "../utils/imageUploader"
// import "../styles/create.css"

const CreateEvent = () => {
  const [currentDateTime, setCurrentDateTime] = useState("")
  const [eventName, setEventName] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [enhancedDescription, setEnhancedDescription] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventVenue, setEventVenue] = useState("")
  const [eventStart, setEventStart] = useState("")
  const [eventEnd, setEventEnd] = useState("")
  const [eventEndDate, setEventEndDate] = useState("")
  const [eventType, setEventType] = useState("Night party")

  const [eventImage, setEventImage] = useState<File | null>(null)
  const [eventImageUrl, setEventImageUrl] = useState("")
  const [uploadProvider, setUploadProvider] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  const cancelUploadRef = useRef<(() => void) | null>(null)

  const [enablePricing, setEnablePricing] = useState(false)
  const [ticketPrices, setTicketPrices] = useState([{ policy: "", price: "" }])

  const [enableStopDate, setEnableStopDate] = useState(false)
  const [stopDate, setStopDate] = useState("")

  const [enableColorCode, setEnableColorCode] = useState(false)
  const [colorCode, setColorCode] = useState("#6b2fa5")

  const [enableMaxSize, setEnableMaxSize] = useState(false)
  const [maxSize, setMaxSize] = useState("")

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

  // Clean up upload when component unmounts
  useEffect(() => {
    return () => {
      if (cancelUploadRef.current) {
        cancelUploadRef.current()
      }
    }
  }, [])

  const addPricingRow = () => {
    setTicketPrices([...ticketPrices, { policy: "", price: "" }])
  }

  const generateUniqueId = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = `0${date.getMonth() + 1}`.slice(-2)
    const day = `0${date.getDate()}`.slice(-2)
    const randomNumbers = Math.floor(100000 + Math.random() * 900000)
    const randomLetters = Math.random().toString(36).substring(2, 4).toUpperCase()
    return {
      eventId: `SPTX-${year}${month}${day}-${randomNumbers}${randomLetters}`,
      payId: `SPTXP-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    setEventImage(file)

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

  const cancelCurrentUpload = () => {
    if (cancelUploadRef.current) {
      cancelUploadRef.current()
      cancelUploadRef.current = null
      setIsUploading(false)
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

      // Validate image is selected
      if (!eventImage) {
        throw new Error("Please select an event image.")
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

      const { eventId, payId } = generateUniqueId()
      const isFree = !enablePricing

      // Use the already uploaded image URL if available, otherwise wait for upload to complete
      let imageUrl = uploadedImageUrl
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
        eventId,
        payId,
        createdBy: user.uid,
        bookerName,
        createdAt: new Date(),
        ticketsSold: 0,
        totalRevenue: 0,
        status: "active",
      }

      // Add event to the events collection under the user's UID
      const eventsCollectionRef = collection(db, "events", user.uid, "userEvents")
      const docRef = await addDoc(eventsCollectionRef, eventData)

      // Update the document with its ID
      await setDoc(
        doc(db, "events", user.uid, "userEvents", docRef.id),
        {
          ...eventData,
          id: docRef.id,
        },
        { merge: true },
      )

      // Store the created event data for success page
      setCreatedEventData({
        eventId,
        payId,
      })

      // Navigate to success page
      navigate("/success", { state: { eventId, payId } })
    } catch (error: any) {
      console.error("Create event error:", error)
      alert(`Failed to create event: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <>
      <Preloader loading={loading} />
      <BookersHeader />
      <div className="create-event-container">
        <div className="current-datetime">Current Date and Time: {currentDateTime}</div>
        <img src="/create-event.svg" alt="Create Event" className="event-image" />
        <h2>Create Your Event: The magic starts here✨</h2>
        <form onSubmit={handleSubmit}>
          <div className="event-section">
            <h3>Event Bio-Data</h3>
            <label>Event Name</label>
            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required />

            <label>Event Image</label>
            <div className="custom-file-upload">
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                onChange={handleFileChange}
                required
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

              {eventImageUrl && (
                <div className="image-preview">
                  <img src={eventImageUrl || "/placeholder.svg"} alt="Event preview" style={{ maxWidth: "200px" }} />
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
                  <input type="checkbox" checked={enableStopDate} onChange={() => setEnableStopDate(!enableStopDate)} />
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
          </div>

          <button type="submit" className="create-button">
            Create Event
          </button>
        </form>
      </div>
    </>
  )
}

export default CreateEvent
