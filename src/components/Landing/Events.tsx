"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { Calendar, MapPin, Tag, Palette } from "lucide-react"
import { useInView } from "react-intersection-observer"
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where } from "firebase/firestore"
import { db } from "../firebase"

interface FeaturedEvent {
  id: string
  eventName: string
  imageURL: string
  eventType: string
  venue: string
  eventStartDate: string
  freeOrPaid: boolean
  creatorID: string
  eventId: string
  bookerName: string
}

interface ThemedEvent extends FeaturedEvent {
  theme: string
  themeColor?: string
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

// Skeleton components
const FeaturedEventSkeleton = () => (
  <div className="featured-event-skeleton">
    <div className="skeleton-content">
      <div className="skeleton-title"></div>
      <div className="skeleton-details">
        <div className="skeleton-detail"></div>
        <div className="skeleton-detail"></div>
        <div className="skeleton-detail"></div>
      </div>
      <div className="skeleton-price"></div>
      <div className="skeleton-button"></div>
    </div>
  </div>
)

const ThemedEventSkeleton = () => (
  <div className="themed-event-skeleton">
    <div className="skeleton-image"></div>
    <div className="skeleton-content">
      <div className="skeleton-title"></div>
      <div className="skeleton-theme"></div>
      <div className="skeleton-details">
        <div className="skeleton-detail"></div>
        <div className="skeleton-detail"></div>
      </div>
    </div>
  </div>
)

const Events = () => {
  const { ref: sectionRef, inView: sectionInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  })

  const [activeIndex, setActiveIndex] = useState(0)
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([])
  const [themedEvents, setThemedEvents] = useState<ThemedEvent[]>([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [loadingThemed, setLoadingThemed] = useState(true)

  // Cache keys and duration
  const featuredCacheKey = "landing_featured_events"
  const themedCacheKey = "landing_themed_events"
  const cacheDuration = 10 * 60 * 1000 // 10 minutes

  // Fetch event details from publicEvents using eventId and creatorID
  const fetchEventDetails = async (eventId: string, creatorID: string) => {
    try {
      // First try to get the event from the publicEvents collection
      const eventDocRef = doc(db, "events", creatorID, "userEvents", eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (eventDoc.exists()) {
        return {
          ...eventDoc.data(),
          id: eventDoc.id,
        }
      }

      // If not found in events collection, try publicEvents
      const publicEventQuery = query(
        collection(db, "publicEvents"),
        where("eventId", "==", eventId),
        where("creatorID", "==", creatorID),
        limit(1),
      )

      const publicEventSnapshot = await getDocs(publicEventQuery)

      if (!publicEventSnapshot.empty) {
        return {
          ...publicEventSnapshot.docs[0].data(),
          id: publicEventSnapshot.docs[0].id,
        }
      }

      return null
    } catch (error) {
      console.error(`Error fetching event details for ${eventId}:`, error)
      return null
    }
  }

  // Fetch featured events from Firestore
  const fetchFeaturedEvents = useCallback(async () => {
    try {
      // Try cache first
      const cachedData = sessionStorage.getItem(featuredCacheKey)
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData)
        if (Date.now() - timestamp < cacheDuration) {
          setFeaturedEvents(data)
          setLoadingFeatured(false)
          return
        }
      }

      const featuredQuery = query(collection(db, "featuredEvents"), orderBy("addedAt", "desc"), limit(5))
      const featuredSnapshot = await getDocs(featuredQuery)

      if (featuredSnapshot.empty) {
        setFeaturedEvents([])
        setLoadingFeatured(false)
        return
      }

      const events: FeaturedEvent[] = []

      // Process each featured event document
      for (const doc of featuredSnapshot.docs) {
        const featuredData = doc.data()

        // Ensure we have the required fields
        if (featuredData.eventId && featuredData.creatorID) {
          // Use the data directly from the featuredEvents collection
          events.push({
            id: doc.id,
            eventName: featuredData.eventName,
            imageURL: featuredData.imageURL,
            eventType: featuredData.eventType,
            venue: featuredData.venue,
            eventStartDate: featuredData.eventStartDate,
            freeOrPaid: featuredData.freeOrPaid,
            creatorID: featuredData.creatorID,
            eventId: featuredData.eventId,
            bookerName: featuredData.bookerName || "Event Organizer",
          })
        }
      }

      setFeaturedEvents(events)

      // Cache the data
      sessionStorage.setItem(
        featuredCacheKey,
        JSON.stringify({
          data: events,
          timestamp: Date.now(),
        }),
      )
    } catch (error) {
      console.error("Error fetching featured events:", error)
    } finally {
      setLoadingFeatured(false)
    }
  }, [featuredCacheKey, cacheDuration])

  // Fetch themed events from Firestore
  const fetchThemedEvents = useCallback(async () => {
    try {
      // Try cache first
      const cachedData = sessionStorage.getItem(themedCacheKey)
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData)
        if (Date.now() - timestamp < cacheDuration) {
          setThemedEvents(data)
          setLoadingThemed(false)
          return
        }
      }

      const themedQuery = query(collection(db, "themedEvents"), orderBy("addedAt", "desc"), limit(8))
      const themedSnapshot = await getDocs(themedQuery)

      if (themedSnapshot.empty) {
        setThemedEvents([])
        setLoadingThemed(false)
        return
      }

      const events: ThemedEvent[] = []

      // Process each themed event document
      for (const doc of themedSnapshot.docs) {
        const themedData = doc.data()

        // Ensure we have the required fields
        if (themedData.eventId && themedData.creatorID) {
          // Use the data directly from the themedEvents collection
          events.push({
            id: doc.id,
            eventName: themedData.eventName,
            imageURL: themedData.imageURL,
            eventType: themedData.eventType,
            venue: themedData.venue,
            eventStartDate: themedData.eventStartDate,
            freeOrPaid: themedData.freeOrPaid,
            creatorID: themedData.creatorID,
            eventId: themedData.eventId,
            bookerName: themedData.bookerName || "Event Organizer",
            theme: themedData.theme || "Featured",
            themeColor: themedData.themeColor || "#6b2fa5",
          })
        }
      }

      setThemedEvents(events)

      // Cache the data
      sessionStorage.setItem(
        themedCacheKey,
        JSON.stringify({
          data: events,
          timestamp: Date.now(),
        }),
      )
    } catch (error) {
      console.error("Error fetching themed events:", error)
    } finally {
      setLoadingThemed(false)
    }
  }, [themedCacheKey, cacheDuration])

  useEffect(() => {
    fetchFeaturedEvents()
    fetchThemedEvents()
  }, [fetchFeaturedEvents, fetchThemedEvents])

  // Auto-rotate featured events
  useEffect(() => {
    if (featuredEvents.length === 0) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredEvents.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [featuredEvents.length])

  const themedEventsRefs = useRef<Array<HTMLAnchorElement | null>>(themedEvents.map(() => null))
  const [themedEventsInView, setThemedEventsInView] = useState(themedEvents.map(() => false))

  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const index = themedEventsRefs.current.findIndex((ref) => ref === entry.target)
      if (index !== -1 && entry.isIntersecting) {
        setThemedEventsInView((prev) => {
          const newState = [...prev]
          newState[index] = true
          return newState
        })
      }
    })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.1 })

    themedEventsRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref)
      }
    })

    return () => observer.disconnect()
  }, [observerCallback, themedEvents])

  // Update refs when themed events change
  useEffect(() => {
    themedEventsRefs.current = themedEvents.map(() => null)
    setThemedEventsInView(themedEvents.map(() => false))
  }, [themedEvents])

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const formatShortDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  return (
    <section id="events" className={`events-section ${sectionInView ? "animate-in" : ""}`} ref={sectionRef}>
      <div className="section-container">
        <h2 className="section-title">Featured Events</h2>

        <div className="featured-event">
          {loadingFeatured ? (
            <FeaturedEventSkeleton />
          ) : featuredEvents.length > 0 ? (
            <>
              {featuredEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`featured-event-card ${index === activeIndex ? "active" : ""}`}
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${event.imageURL})`,
                  }}
                >
                  <div className="featured-event-content">
                    <h3 className="featured-event-title">{event.eventName}</h3>
                    <div className="featured-event-details">
                      <div className="event-detail">
                        <Calendar size={16} />
                        <span>{formatDate(event.eventStartDate)}</span>
                      </div>
                      <div className="event-detail">
                        <MapPin size={16} />
                        <span>{event.venue}</span>
                      </div>
                      <div className="event-detail">
                        <Tag size={16} />
                        <span>{event.eventType}</span>
                      </div>
                    </div>
                    <div className="featured-event-price">
                      <span className={!event.freeOrPaid ? "free" : "paid"}>{!event.freeOrPaid ? "Free" : "Paid"}</span>
                    </div>
                    <Link to={`/event/${event.creatorID}/${event.eventId}`} className="featured-event-button">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}

              <div className="featured-event-indicators">
                {featuredEvents.map((_, index) => (
                  <button
                    key={index}
                    className={`indicator ${index === activeIndex ? "active" : ""}`}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="no-events-message">
              <p>No featured events available at the moment.</p>
            </div>
          )}
        </div>

        <h3 className="themed-events-title">Themed Events</h3>
        <div className="themed-events-grid">
          {loadingThemed
            ? Array(4)
                .fill(0)
                .map((_, index) => <ThemedEventSkeleton key={index} />)
            : themedEvents.length > 0
              ? themedEvents.map((event, index) => (
                  <Link
                    to={`/event/${event.creatorID}/${event.eventId}`}
                    key={event.id}
                    className={`themed-event-card ${themedEventsInView[index] ? "animate-in" : ""}`}
                    ref={(el) => {
                      themedEventsRefs.current[index] = el
                    }}
                    style={{
                      borderColor: event.themeColor || "#6b2fa5",
                    }}
                  >
                    <div className="themed-event-image">
                      <LazyImage src={event.imageURL || "/placeholder.svg"} alt={event.eventName} />
                      <div
                        className="theme-overlay"
                        style={{
                          background: `linear-gradient(45deg, ${event.themeColor || "#6b2fa5"}20, ${event.themeColor || "#6b2fa5"}40)`,
                        }}
                      >
                        <div className="theme-badge" style={{ backgroundColor: event.themeColor || "#6b2fa5" }}>
                          <Palette size={12} />
                          <span>{event.theme}</span>
                        </div>
                      </div>
                    </div>
                    <div className="themed-event-content">
                      <h4 className="themed-event-title">{event.eventName}</h4>
                      <div className="themed-event-details">
                        <div className="event-detail">
                          <Calendar size={14} />
                          <span>{formatShortDate(event.eventStartDate)}</span>
                        </div>
                        <div className="event-detail">
                          <Tag size={14} />
                          <span>{event.eventType}</span>
                        </div>
                      </div>
                      <div className="event-price-tag">
                        <span className={!event.freeOrPaid ? "free" : "paid"}>
                          {!event.freeOrPaid ? "Free" : "Paid"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              : Array(4)
                  .fill(0)
                  .map((_, index) => (
                    <div key={index} className="no-themed-events-card">
                      <p>No themed events available</p>
                    </div>
                  ))}
        </div>

        <div className="view-all-container">
          <Link to="/home" className="view-all-button">
            View All Events
          </Link>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .lazy-image-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .lazy-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.3s ease-in-out;
        }

        .image-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
        }

        .image-skeleton {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        .image-error {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.1);
          color: #666;
          font-size: 14px;
        }

        .featured-event-skeleton {
          height: 400px;
          background: #f0f0f0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .skeleton-content {
          padding: 2rem;
          width: 100%;
        }

        .skeleton-title {
          height: 2rem;
          background: #e0e0e0;
          border-radius: 4px;
          margin-bottom: 1rem;
          width: 60%;
        }

        .skeleton-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .skeleton-detail {
          height: 1rem;
          background: #e0e0e0;
          border-radius: 4px;
          width: 80%;
        }

        .skeleton-price {
          height: 1.5rem;
          background: #e0e0e0;
          border-radius: 20px;
          width: 30%;
          margin-bottom: 1rem;
        }

        .skeleton-button {
          height: 2.5rem;
          background: #e0e0e0;
          border-radius: 6px;
          width: 40%;
        }

        .themed-event-skeleton {
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }

        .themed-event-skeleton .skeleton-image {
          height: 150px;
          background: #f0f0f0;
        }

        .themed-event-skeleton .skeleton-content {
          padding: 1rem;
        }

        .themed-event-skeleton .skeleton-theme {
          height: 1rem;
          background: #e0e0e0;
          border-radius: 4px;
          width: 50%;
          margin-bottom: 0.5rem;
        }

        .themed-events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .themed-event-card {
          border: 2px solid #6b2fa5;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          background: white;
          text-decoration: none;
          color: inherit;
          transform: translateY(20px);
          opacity: 0;
        }

        .themed-event-card.animate-in {
          transform: translateY(0);
          opacity: 1;
        }

        .themed-event-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .themed-event-image {
          height: 150px;
          position: relative;
          overflow: hidden;
        }

        .theme-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 0.75rem;
        }

        .theme-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: #6b2fa5;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .themed-event-content {
          padding: 1rem;
        }

        .themed-event-title {
          margin: 0 0 0.75rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          line-height: 1.3;
        }

        .themed-event-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .event-detail {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .event-price-tag {
          display: flex;
          justify-content: flex-start;
        }

        .event-price-tag span {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .event-price-tag .free {
          background: #d4edda;
          color: #155724;
        }

        .event-price-tag .paid {
          background: #fff3cd;
          color: #856404;
        }

        .no-events-message,
        .no-themed-events-card {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          background: #f8f9fa;
          border-radius: 12px;
          color: #666;
          font-style: italic;
        }

        .themed-events-title {
          margin: 3rem 0 2rem 0;
          font-size: 1.8rem;
          font-weight: 600;
          color: #333;
          text-align: center;
        }

        @keyframes loading {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          .lazy-image-container img,
          .image-skeleton,
          .themed-event-card {
            animation: none;
            transition: none;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .themed-events-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .themed-events-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}

export default Events
