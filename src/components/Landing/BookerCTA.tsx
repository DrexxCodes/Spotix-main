"use client"

import { Link } from "react-router-dom"
import { Calendar, DollarSign, BarChart } from "lucide-react"
import { useInView } from "react-intersection-observer"

const BookerCTA = () => {
  const { ref: sectionRef, inView: sectionInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  })

  const { ref: contentRef, inView: contentInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
    delay: 200,
  })

  const { ref: imageRef, inView: imageInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
    delay: 400,
  })

  const bookerFeatures = [
    {
      icon: <Calendar size={24} />,
      title: "Create Events",
      description: "Easily create and manage your events with our intuitive dashboard.",
    },
    {
      icon: <DollarSign size={24} />,
      title: "Sell Tickets",
      description: "Set up ticket types, prices, and manage sales all in one place.",
    },
    {
      icon: <BarChart size={24} />,
      title: "Track Analytics",
      description: "Get detailed insights on ticket sales, attendee demographics, and more.",
    },
  ]

  return (
    <section className={`booker-cta-section ${sectionInView ? "animate-in" : ""}`} ref={sectionRef}>
      <div className="section-container">
        <div className={`booker-cta-content ${contentInView ? "animate-in" : ""}`} ref={contentRef}>
          <h2 className="booker-cta-title">Become a Booker</h2>
          <p className="booker-cta-description">
            Are you an event organizer? Join Spotix as a booker and start creating and managing your own events.
          </p>

          <div className="booker-features">
            {bookerFeatures.map((feature, index) => (
              <div key={index} className="booker-feature">
                <div className="booker-feature-icon">{feature.icon}</div>
                <div className="booker-feature-content">
                  <h3 className="booker-feature-title">{feature.title}</h3>
                  <p className="booker-feature-description">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="booker-cta-buttons">
            <Link to="/createevent" className="booker-cta-button primary">
              Create Event
            </Link>
            <Link to="/bookerRole" className="booker-cta-button secondary">
              Learn More
            </Link>
          </div>
        </div>

        <div className={`booker-cta-image ${imageInView ? "animate-in" : ""}`} ref={imageRef}>
          <img src="/Capture.PNG?height=500&width=500" alt="Booker Dashboard" />
        </div>
      </div>
    </section>
  )
}

export default BookerCTA

