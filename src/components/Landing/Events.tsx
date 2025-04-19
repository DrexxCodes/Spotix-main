"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { Calendar, MapPin, Tag } from "lucide-react"
import { useInView } from "react-intersection-observer"

const Events = () => {
  const { ref: sectionRef, inView: sectionInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  })

  const [activeIndex, setActiveIndex] = useState(0)

  // Auto-rotate featured events
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredEvents.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const featuredEvents = [
    {
      id: "event1",
      title: "Tech Conference 2023",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425237/samples/cloudinary-group.jpg?height=400&width=600",
      date: "November 15, 2023",
      location: "San Francisco, CA",
      type: "Conference",
      price: "Paid",
    },
    {
      id: "event2",
      title: "Summer Music Festival",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425237/samples/landscapes/beach-boat.jpg?height=400&width=600",
      date: "July 10, 2023",
      location: "Austin, TX",
      type: "Festival",
      price: "Paid",
    },
    {
      id: "event3",
      title: "Business Summit",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425237/samples/imagecon-group.jpg?height=400&width=600",
      date: "September 5, 2023",
      location: "New York, NY",
      type: "Summit",
      price: "Free",
    },
  ]

  const upcomingEvents = [
    {
      id: "event4",
      title: "Charity Gala",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425237/samples/food/spices.jpg?height=200&width=300",
      date: "December 12, 2023",
      type: "Gala",
    },
    {
      id: "event5",
      title: "Art Exhibition",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425237/samples/ecommerce/accessories-bag.jpg?height=200&width=300",
      date: "October 20, 2023",
      type: "Exhibition",
    },
    {
      id: "event6",
      title: "Comedy Night",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425237/samples/people/bicycle.jpg?height=200&width=300",
      date: "November 5, 2023",
      type: "Entertainment",
    },
    {
      id: "event7",
      title: "Startup Pitch Day",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425237/samples/ecommerce/leather-bag-gray.jpg?height=200&width=300",
      date: "October 15, 2023",
      type: "Business",
    },
  ]

  const upcomingEventsRefs = useRef<Array<HTMLAnchorElement | null>>(upcomingEvents.map(() => null))
  const [upcomingEventsInView, setUpcomingEventsInView] = useState(upcomingEvents.map(() => false))

  const observerCallback = useCallback((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setUpcomingEventsInView((prev) => {
          const newState = [...prev]
          newState[index] = true
          return newState
        })
      }
    })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.1 })

    upcomingEventsRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref)
      }
    })

    return () => observer.disconnect()
  }, [observerCallback])

  return (
    <section id="events" className={`events-section ${sectionInView ? "animate-in" : ""}`} ref={sectionRef}>
      <div className="section-container">
        <h2 className="section-title">Popular Events</h2>

        <div className="featured-event">
          {featuredEvents.map((event, index) => (
            <div
              key={event.id}
              className={`featured-event-card ${index === activeIndex ? "active" : ""}`}
              style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${event.image})`,
              }}
            >
              <div className="featured-event-content">
                <h3 className="featured-event-title">{event.title}</h3>
                <div className="featured-event-details">
                  <div className="event-detail">
                    <Calendar size={16} />
                    <span>{event.date}</span>
                  </div>
                  <div className="event-detail">
                    <MapPin size={16} />
                    <span>{event.location}</span>
                  </div>
                  <div className="event-detail">
                    <Tag size={16} />
                    <span>{event.type}</span>
                  </div>
                </div>
                <div className="featured-event-price">
                  <span className={event.price === "Free" ? "free" : "paid"}>{event.price}</span>
                </div>
                <Link to={`/event/${event.id}`} className="featured-event-button">
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
        </div>

        <h3 className="upcoming-events-title">Upcoming Events</h3>
        <div className="upcoming-events-grid">
          {upcomingEvents.map((event, index) => {
            return (
              <Link
                to={`/event/${event.id}`}
                key={event.id}
                className={`upcoming-event-card ${upcomingEventsInView[index] ? "animate-in" : ""}`}
                ref={(el) => {
                  upcomingEventsRefs.current[index] = el
                }}
              >
                <div className="upcoming-event-image">
                  <img src={event.image || "/placeholder.svg"} alt={event.title} />
                </div>
                <div className="upcoming-event-content">
                  <h4 className="upcoming-event-title">{event.title}</h4>
                  <div className="upcoming-event-details">
                    <div className="event-detail">
                      <Calendar size={14} />
                      <span>{event.date}</span>
                    </div>
                    <div className="event-detail">
                      <Tag size={14} />
                      <span>{event.type}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="view-all-container">
          <Link to="/events" className="view-all-button">
            View All Events
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Events

