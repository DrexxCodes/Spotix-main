"use client"

import type React from "react"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { useInView } from "react-intersection-observer"

const Testimonials = () => {
  const { ref: sectionRef, inView: sectionInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  })

  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))
  }

  // Touch event handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      handleNext()
    }

    if (isRightSwipe) {
      handlePrevious()
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Regular User",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425246/cld-sample.jpg?height=100&width=100",
      quote:
        "Spotix has completely changed how I discover and attend events. The platform is intuitive, and I love how easy it is to find events that match my interests.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Event Attendee",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425236/samples/people/smiling-man.jpg?height=100&width=100",
      quote:
        "I've been using Spotix for over a year now, and it's been fantastic. The ticket purchasing process is seamless, and I appreciate the email reminders before events.",
      rating: 5,
    },
    {
      name: "Jessica Williams",
      role: "Booker",
      image: "https://res.cloudinary.com/dyrdbgqyi/image/upload/v1743425236/samples/bike.jpg?height=100&width=100",
      quote:
        "As an event organizer, Spotix has made my life so much easier. The analytics dashboard gives me valuable insights, and the platform handles all the ticket sales smoothly.",
      rating: 4,
    },
  ]

  return (
    <section id="testimonials" className={`testimonials-section ${sectionInView ? "animate-in" : ""}`} ref={sectionRef}>
      <div className="section-container">
        <h2 className="section-title">What Our Users Say</h2>

        <div
          className="testimonials-carousel"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button className="carousel-arrow prev" onClick={handlePrevious}>
            <ChevronLeft size={24} />
          </button>

          <div className="testimonials-track">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`testimonial-card ${index === activeIndex ? "active" : ""}`}
                style={{
                  transform: `translateX(${(index - activeIndex) * 100}%)`,
                  opacity: index === activeIndex ? 1 : 0,
                }}
              >
                <div className="testimonial-content">
                  <div className="testimonial-quote">"{testimonial.quote}"</div>
                  <div className="testimonial-rating">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        fill={i < testimonial.rating ? "#FFD700" : "none"}
                        color={i < testimonial.rating ? "#FFD700" : "#ccc"}
                      />
                    ))}
                  </div>
                </div>
                <div className="testimonial-author">
                  <img
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    className="testimonial-author-image"
                  />
                  <div className="testimonial-author-info">
                    <div className="testimonial-author-name">{testimonial.name}</div>
                    <div className="testimonial-author-role">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="carousel-arrow next" onClick={handleNext}>
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="testimonial-indicators">
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials

