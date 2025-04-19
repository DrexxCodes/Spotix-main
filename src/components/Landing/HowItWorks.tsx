"use client"

import React, { useState, useEffect, useRef } from "react"
import { useInView } from "react-intersection-observer"
import { CheckCircle, Calendar, Ticket } from "lucide-react"

const HowItWorks = () => {
  // Main section ref with threshold
  const { ref: sectionRef, inView: sectionInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  })

  const steps = [
    {
      icon: <CheckCircle size={48} />,
      title: "Sign Up",
      description: "Create your free Spotix account in seconds and join our community of event-goers.",
    },
    {
      icon: <Calendar size={48} />,
      title: "Find Events",
      description: "Discover exciting events happening near you with our intuitive search and filter options. Spot the event that matches your vibe.",
    },
    {
      icon: <Ticket size={48} />,
      title: "Book & Attend",
      description: "Secure your tickets with our seamless booking process and enjoy the event, easy as pie!",
    },
  ]

  // Create individual refs for each step card
  const [stepInViews, setStepInViews] = useState(steps.map(() => false))
  const stepRefs = useRef(steps.map(() => React.createRef<HTMLDivElement>()))

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = stepRefs.current.findIndex((ref) => ref.current === entry.target)
          if (index !== -1 && entry.isIntersecting) {
            setStepInViews((prev) => {
              const newState = [...prev]
              newState[index] = true
              return newState
            })
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -50px 0px",
      },
    )

    stepRefs.current.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current)
      }
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section id="how-it-works" className={`how-it-works-section ${sectionInView ? "animate-in" : ""}`} ref={sectionRef}>
      <div className="section-container">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container mobile-friendly">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`step-card ${stepInViews[index] ? "animate-in" : ""}`}
              ref={stepRefs.current[index]}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks

