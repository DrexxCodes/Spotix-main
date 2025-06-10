"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "../services/firebase"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import { Helmet } from "react-helmet"
import { ArrowLeft, Calendar, User, Clock } from "lucide-react"
import "./event-group.css"

interface EventGroupType {
  name: string
  image: string
  description: string
  createdAt: any
  creatorID?: string
  eventType?: string
  venue?: string
  eventStartDate?: string
  freeOrPaid?: boolean
  eventId?: string
  eventGroup?: boolean
}

interface EventVariation {
  id: string
  eventName: string
  eventImage: string
  eventDate: string
  eventVenue: string
  eventType: string
  isFree: boolean
  ticketPrices: { policy: string; price: number }[]
  createdAt: any
}

interface OrganizerInfo {
  username: string
  email: string
  isVerified: boolean
}

// Lazy loading hook
const useLazyLoading = (ref: React.RefObject<HTMLElement | null>, threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const currentRef = ref.current

    if (!currentRef) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )

    observer.observe(currentRef)

    return () => {
      observer.disconnect()
    }
  }, [ref, threshold])

  return isVisible
}

// Lazy Image Component
const LazyImage: React.FC<{
  src: string
  alt: string
  className?: string
}> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)
  const isVisible = useLazyLoading(imgRef)

  return (
    <div ref={imgRef} className={`lazy-image-container ${className || ""}`}>
      {isVisible && (
        <>
          {!isLoaded && !hasError && (
            <div className="image-placeholder">
              <div className="image-skeleton"></div>
            </div>
          )}
          <img
            src={src || "/placeholder.svg"}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true)
              setIsLoaded(true)
            }}
            style={{
              opacity: isLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
          />
          {hasError && (
            <div className="image-error">
              <span>Failed to load image</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Loading skeleton component
const EventGroupSkeleton = () => (
  <div className="event-group-container animate-pulse">
    <div className="event-group-header">
      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
    </div>
    <div className="hero-section">
      <div className="h-96 w-full bg-gray-200 rounded-lg"></div>
    </div>
    <div className="content-section p-6 space-y-4">
      <div className="h-8 w-3/4 bg-gray-200 rounded-md"></div>
      <div className="h-32 w-full bg-gray-200 rounded-md"></div>
      <div className="flex space-x-4">
        <div className="h-6 w-32 bg-gray-200 rounded-md"></div>
        <div className="h-6 w-32 bg-gray-200 rounded-md"></div>
      </div>
    </div>
  </div>
)

const EventVariationCard: React.FC<{
  event: EventVariation
  onClick: () => void
}> = ({ event, onClick }) => {
  const formatNumber = useCallback((num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }, [])

  const formatCurrency = useCallback(
    (amount: number): string => {
      return `₦${formatNumber(Number.parseFloat(amount.toFixed(2)))}`
    },
    [formatNumber],
  )

  return (
    <div className="event-variation-card" onClick={onClick}>
      <div className="variation-image">
        <LazyImage src={event.eventImage || "/placeholder.svg"} alt={event.eventName} />
        <div className="variation-overlay">
          <span className={`price-tag ${event.isFree ? "free" : "paid"}`}>{event.isFree ? "Free" : "Paid"}</span>
        </div>
      </div>
      <div className="variation-content">
        <h3 className="variation-title">{event.eventName}</h3>
        <div className="variation-details">
          <div className="variation-date">
            <Calendar size={14} />
            <span>
              {new Date(event.eventDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="variation-venue">
            <span>{event.eventVenue}</span>
          </div>
          {!event.isFree && event.ticketPrices && event.ticketPrices.length > 0 && (
            <div className="variation-price">
              <span>From {formatCurrency(Math.min(...event.ticketPrices.map((t) => Number(t.price))))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const EventGroup = () => {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Extract parameters with multiple possible names
  const uid = params.uid || params.creatorID || params.id
  const eventName = params.eventName || params.name || params.event

  // Also try to extract from pathname manually as fallback
  const pathSegments = location.pathname.split("/").filter((segment) => segment !== "")

  // Manual extraction as fallback
  let fallbackUid: string | undefined
  let fallbackEventName: string | undefined

  if (pathSegments.length >= 3 && pathSegments[0] === "event-group") {
    fallbackUid = pathSegments[1]
    fallbackEventName = pathSegments[2]
  }

  const finalUid = uid || fallbackUid
  const finalEventName = eventName || fallbackEventName

  const [eventGroupData, setEventGroupData] = useState<EventGroupType | null>(null)
  const [eventVariations, setEventVariations] = useState<EventVariation[]>([])
  const [organizerInfo, setOrganizerInfo] = useState<OrganizerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEventGroupData = useCallback(async () => {
    try {
      if (!finalUid || !finalEventName) {
        setError("Missing required parameters")
        setLoading(false)
        return
      }

      // Properly decode the event name from URL
      const decodedEventName = decodeURIComponent(finalEventName.replace(/\+/g, " "))

      // Try multiple variations of the event name to handle encoding issues
      const eventNameVariations = [
        decodedEventName,
        finalEventName,
        finalEventName.replace(/%20/g, " "),
        finalEventName.replace(/\+/g, " "),
        decodeURI(finalEventName),
        decodeURIComponent(finalEventName),
      ]

      let collectionDoc:
        | import("firebase/firestore").DocumentSnapshot<import("firebase/firestore").DocumentData>
        | null = null
      let usedEventName: string | null = null

      // Try each variation until we find a match
      for (const nameVariation of eventNameVariations) {
        try {
          const collectionDocRef = doc(db, "EventCollection", finalUid, "collections", nameVariation)
          const testDoc = await getDoc(collectionDocRef)
          if (testDoc.exists()) {
            collectionDoc = testDoc
            usedEventName = nameVariation
            break
          }
        } catch (err) {
          // Continue to next variation
        }
      }

      if (!collectionDoc || !collectionDoc.exists()) {
        setError("Event collection not found")
        setLoading(false)
        return
      }

      const collectionData = collectionDoc.data() as EventGroupType
      setEventGroupData(collectionData)

      // Fetch organizer info
      const organizerDoc = await getDoc(doc(db, "users", finalUid))
      if (organizerDoc.exists()) {
        const organizerData = organizerDoc.data()
        setOrganizerInfo({
          username: organizerData.username || "Unknown Organizer",
          email: organizerData.email || "Not provided",
          isVerified: organizerData.isVerified || false,
        })
      }

      // Fetch event variations using the successfully found event name
      if (!usedEventName) {
        setError("Event collection not found")
        setLoading(false)
        return
      }
      const eventsCollectionRef = collection(db, "EventCollection", finalUid, "collections", usedEventName, "events")
      const eventsQuery = query(eventsCollectionRef, orderBy("createdAt", "desc"))
      const eventsSnapshot = await getDocs(eventsQuery)

      const variations: EventVariation[] = []
      eventsSnapshot.forEach((eventDoc) => {
        const eventData = eventDoc.data()
        variations.push({ id: eventDoc.id, ...eventData } as EventVariation)
      })

      setEventVariations(variations)
    } catch (error) {
      setError("Failed to load event collection")
    } finally {
      setLoading(false)
    }
  }, [finalUid, finalEventName])

  useEffect(() => {
    fetchEventGroupData()
  }, [fetchEventGroupData])

  const handleBackClick = () => {
    navigate("/home")
  }

  const handleVariationClick = (variation: EventVariation) => {
    navigate(`/event/${finalUid}/${variation.id}`)
  }

  if (loading) {
    return (
      <div className="app-wrapper">
        <UserHeader />
        <div className="main-content">
          <EventGroupSkeleton />
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !eventGroupData) {
    return (
      <div className="app-wrapper">
        <UserHeader />
        <div className="main-content">
          <div className="error-message">
            <h2>Error Loading Event Collection</h2>
            <p>{error || "Event collection not found."}</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Format the timestamp if it exists
  const formattedDate = eventGroupData.createdAt
    ? typeof eventGroupData.createdAt.toDate === "function"
      ? eventGroupData.createdAt.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date(eventGroupData.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
    : "Date not available"

  return (
    <div className="app-wrapper">
      <Helmet>
        <title>{eventGroupData.name} - Event Collection</title>
        <meta name="description" content={`Explore the ${eventGroupData.name} event collection and its variations`} />
      </Helmet>

      <UserHeader />

      <div className="main-content">
        <div className="event-group-container">
          <div className="event-group-header">
            <button className="back-button" onClick={handleBackClick}>
              <ArrowLeft size={24} />
            </button>
          </div>

          {/* Hero Section with Blurred Background */}
          <div className="hero-section">
            <div className="hero-background">
              <LazyImage
                src={eventGroupData.image || "/placeholder.svg"}
                alt={eventGroupData.name}
                className="hero-bg-image"
              />
              <div className="hero-overlay"></div>
            </div>
            <div className="hero-content">
              <div className="collection-badge">
                <span>Event Collection</span>
              </div>
              <h1 className="hero-title">{eventGroupData.name}</h1>
            </div>
          </div>

          {/* Content Section */}
          <div className="content-section">
            {/* Event Description */}
            {eventGroupData.description && (
              <div className="description-section">
                <h2>About This Collection</h2>
                <p className="description-text">{eventGroupData.description}</p>
              </div>
            )}

            {/* Collection Info */}
            <div className="info-grid">
              <div className="info-card">
                <div className="info-icon">
                  <Calendar size={20} />
                </div>
                <div className="info-content">
                  <span className="info-label">Collection Created</span>
                  <span className="info-value">{formattedDate}</span>
                </div>
              </div>

              {organizerInfo && (
                <div className="info-card">
                  <div className="info-icon">
                    <User size={20} />
                  </div>
                  <div className="info-content">
                    <span className="info-label">Organized by</span>
                    <span className="info-value">
                      {organizerInfo.username}
                      {organizerInfo.isVerified && (
                        <span className="verified-badge" title="Verified Organizer">
                          ✓
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Event Variations */}
            <div className="variations-section">
              <div className="variations-header">
                <h2>Event Variations</h2>
                <div className="variations-count">
                  <Clock size={16} />
                  <span>
                    {eventVariations.length} variation{eventVariations.length !== 1 ? "s" : ""} available
                  </span>
                </div>
              </div>

              {eventVariations.length > 0 ? (
                <div className="variations-grid">
                  {eventVariations.map((variation) => (
                    <EventVariationCard
                      key={variation.id}
                      event={variation}
                      onClick={() => handleVariationClick(variation)}
                    />
                  ))}
                </div>
              ) : (
                <div className="no-variations">
                  <p>No event variations available yet.</p>
                  <p>Check back later for upcoming events in this collection!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Enhanced CSS for hero section and collection name display */}
      <style>{`
        .app-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          position: relative;
        }

        .main-content {
          flex: 1;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .hero-section {
          position: relative;
          height: 400px;
          overflow: hidden;
          border-radius: 16px;
          margin: 20px;
        }

        .hero-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .hero-bg-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(8px);
          transform: scale(1.1);
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            135deg,
            rgba(107, 47, 165, 0.7) 0%,
            rgba(139, 92, 246, 0.6) 50%,
            rgba(0, 0, 0, 0.4) 100%
          );
          z-index: 2;
        }

        .hero-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 3;
          color: white;
          width: 90%;
          max-width: 600px;
        }

        .collection-badge {
          margin-bottom: 16px;
        }

        .collection-badge span {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 900;
          margin: 0;
          text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        @media (max-width: 768px) {
          .hero-section {
            height: 300px;
            margin: 10px;
          }

          .hero-title {
            font-size: 2rem;
          }

          .collection-badge span {
            font-size: 12px;
            padding: 6px 12px;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.5rem;
          }
        }

        .error-message {
          padding: 40px 20px;
          text-align: center;
          max-width: 600px;
          margin: 2rem auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .error-message h2 {
          color: #dc3545;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}

export default EventGroup
